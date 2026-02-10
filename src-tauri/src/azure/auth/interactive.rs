//! Interactive browser authentication flow
//!
//! This module implements the OAuth 2.0 device code flow for interactive
//! browser-based authentication. This is the recommended authentication
//! method as it doesn't require storing secrets.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use azure_core::credentials::{AccessToken, Secret, TokenCredential, TokenRequestOptions};
use azure_core::Error;
use log::{error as log_error, info};
use time::OffsetDateTime;

use crate::azure::auth::state::{AUTH_CREDENTIAL, DEVICE_CODE_STATE};
use crate::azure::auth::token::store_auth_result;
use crate::azure::auth::types::{
  AuthResult, DeviceCodeInfo, DeviceCodeResponse, DeviceCodeState, TokenResponse,
};
use crate::config::{
  AUTH_SCOPES, DEVICE_CODE_ENDPOINT, MAX_POLL_ATTEMPTS, POLL_SLOWDOWN_SECONDS,
  TOKEN_ENDPOINT,
};
use crate::user_config::{get_client_id, get_tenant_id};

/// Cached token for a specific scope
#[derive(Debug, Clone)]
struct CachedToken {
    access_token: AccessToken,
    scope: String,
}

/// Credential implementation for interactive device code flow
/// Supports refresh tokens to get access tokens for different Azure resources
#[derive(Debug)]
struct InteractiveDeviceCodeCredential {
    client_id: String,
    tenant_id: String,
    /// Cached access tokens per scope
    cached_tokens: Arc<tokio::sync::RwLock<HashMap<String, AccessToken>>>,
    /// Refresh token for getting new access tokens
    refresh_token: Arc<tokio::sync::RwLock<Option<String>>>,
}

impl InteractiveDeviceCodeCredential {
    /// Use refresh token to get an access token for a specific scope
    async fn get_token_with_refresh(&self, scope: &str) -> azure_core::Result<AccessToken> {
        let refresh_token = {
            let rt_lock = self.refresh_token.read().await;
            rt_lock.clone().ok_or_else(|| {
                Error::with_message(
                    azure_core::error::ErrorKind::Credential,
                    "No refresh token available - please re-authenticate",
                )
            })?
        };

        info!("Using refresh token to get access token for scope: {}", scope);

        // Convert .default scopes to user_impersonation format for v2 endpoint
        // v2 OAuth requires a path component in the scope (e.g., /user_impersonation)
        let resource_scope = if scope.ends_with("/.default") {
            let base = scope.trim_end_matches("/.default");
            format!("{}/user_impersonation", base)
        } else {
            scope.to_string()
        };

        info!("Converted scope for refresh token: {}", resource_scope);

        let client = reqwest::Client::new();
        let url = format!("{}/{}/oauth2/v2.0/token", TOKEN_ENDPOINT, self.tenant_id);

        let response = client
            .post(&url)
            .form(&[
                ("grant_type", "refresh_token"),
                ("client_id", &self.client_id),
                ("refresh_token", &refresh_token),
                ("scope", resource_scope.as_str()),
            ])
            .send()
            .await
            .map_err(|e| Error::with_message(azure_core::error::ErrorKind::Io, e.to_string()))?;

        if response.status().is_success() {
            let token_res: TokenResponse = response.json().await.map_err(|e| {
                Error::with_message(azure_core::error::ErrorKind::DataConversion, e.to_string())
            })?;

            // Update refresh token if a new one was provided
            if let Some(new_refresh_token) = token_res.refresh_token {
                let mut rt_lock = self.refresh_token.write().await;
                *rt_lock = Some(new_refresh_token);
            }

            let expires_in = token_res.expires_in.unwrap_or(3600);
            let expires_on = OffsetDateTime::now_utc() + std::time::Duration::from_secs(expires_in);
            let access_token = AccessToken::new(Secret::new(token_res.access_token), expires_on);

            // Cache the token for this scope (using original scope as key)
            {
                let mut cache = self.cached_tokens.write().await;
                cache.insert(scope.to_string(), access_token.clone());
            }

            info!("Successfully obtained access token for scope: {}", scope);
            Ok(access_token)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            log_error!("Failed to refresh token for scope {}: {}", scope, error_text);

            // Check if this is the common "personal account can't access enterprise resources" error
            if error_text.contains("AADSTS70011") &&
               (error_text.contains("management.azure.com") || error_text.contains("does not exist")) {
                return Err(Error::with_message(
                    azure_core::error::ErrorKind::Credential,
                    format!(
                        "Personal Microsoft accounts cannot access Azure Resource Manager API directly.\n\n\
                        To access Azure resources with your personal account, you have two options:\n\
                        1. Use Azure CLI authentication instead (run 'az login' then restart VaultRaider)\n\
                        2. Ask an Azure AD administrator to add your account as a guest user to their tenant\n\n\
                        Error details: {}", error_text
                    ),
                ));
            }

            Err(Error::with_message(
                azure_core::error::ErrorKind::Credential,
                format!("Failed to get token for scope {}: {}", scope, error_text),
            ))
        }
    }
}

#[async_trait]
impl TokenCredential for InteractiveDeviceCodeCredential {
    async fn get_token(
        &self,
        scopes: &[&str],
        _options: Option<TokenRequestOptions<'_>>,
    ) -> azure_core::Result<AccessToken> {
        let scope = scopes.join(" ");
        info!(
            "Getting token from InteractiveDeviceCodeCredential for scope: {}",
            scope
        );

        // Check if we have a valid cached token for this scope
        {
            let cache = self.cached_tokens.read().await;
            if let Some(token) = cache.get(&scope) {
                if token.expires_on > OffsetDateTime::now_utc() {
                    info!("Using cached token for scope: {}", scope);
                    return Ok(token.clone());
                }
            }
        }

        // Check if we have a refresh token - if so, use it
        {
            let rt_lock = self.refresh_token.read().await;
            if rt_lock.is_some() {
                drop(rt_lock); // Release the lock before calling async function
                return self.get_token_with_refresh(&scope).await;
            }
        }

        // No refresh token yet - need to do initial device code flow
        let state = {
            let state_lock = DEVICE_CODE_STATE.lock().await;
            state_lock.clone().ok_or_else(|| {
                Error::with_message(
                    azure_core::error::ErrorKind::Other,
                    "No device code state found - please start authentication first",
                )
            })?
        };

        let client = reqwest::Client::new();
        let url = format!("{}/{}/oauth2/v2.0/token", TOKEN_ENDPOINT, self.tenant_id);

        let mut attempts = 0;
        loop {
            if attempts >= MAX_POLL_ATTEMPTS {
                return Err(Error::with_message(
                    azure_core::error::ErrorKind::Other,
                    "Authentication timed out",
                ));
            }

            // Note: For device code flow, we don't pass 'scope' in the token request.
            // The scopes are determined by what was requested during the device code request.
            let response = client
                .post(&url)
                .form(&[
                    ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
                    ("client_id", &self.client_id),
                    ("device_code", &state.device_code),
                ])
                .send()
                .await
                .map_err(|e| {
                    Error::with_message(azure_core::error::ErrorKind::Io, e.to_string())
                })?;

            if response.status().is_success() {
                let token_res: TokenResponse = response.json().await.map_err(|e| {
                    Error::with_message(azure_core::error::ErrorKind::DataConversion, e.to_string())
                })?;

                // Store refresh token for later use
                if let Some(ref refresh_token) = token_res.refresh_token {
                    info!("Storing refresh token for future scope requests");
                    let mut rt_lock = self.refresh_token.write().await;
                    *rt_lock = Some(refresh_token.clone());
                }

                let expires_in = token_res.expires_in.unwrap_or(3600);
                let expires_on =
                    OffsetDateTime::now_utc() + std::time::Duration::from_secs(expires_in);
                let access_token =
                    AccessToken::new(Secret::new(token_res.access_token), expires_on);

                // Cache token (for identity scopes)
                {
                    let mut cache = self.cached_tokens.write().await;
                    cache.insert(AUTH_SCOPES.to_string(), access_token.clone());
                }

                return Ok(access_token);
            } else {
                let error_json: serde_json::Value = response.json().await.unwrap_or_default();
                let error_code = error_json["error"].as_str().unwrap_or("");

                if error_code == "authorization_pending" {
                    attempts += 1;
                    tokio::time::sleep(std::time::Duration::from_secs(state.interval)).await;
                } else if error_code == "slow_down" {
                    tokio::time::sleep(std::time::Duration::from_secs(
                        state.interval + POLL_SLOWDOWN_SECONDS,
                    ))
                    .await;
                } else {
                    return Err(Error::with_message(
                        azure_core::error::ErrorKind::Other,
                        format!("Authentication failed: {}", error_code),
                    ));
                }
            }
        }
    }
}

/// Start interactive browser login flow (uses device code flow)
///
/// This initiates the device code authentication flow where the user
/// is given a code to enter at a Microsoft URL.
///
/// # Returns
///
/// Returns device code information including the code and verification URL.
pub async fn start_interactive_browser_login() -> Result<DeviceCodeInfo, String> {
    info!("Starting interactive browser login flow...");

    // Get dynamic configuration
    let client_id = get_client_id().await;
    let tenant_id = get_tenant_id().await;

    let device_code_url = format!(
        "{}/{}/oauth2/v2.0/devicecode",
        DEVICE_CODE_ENDPOINT, tenant_id
    );

    let mut params = HashMap::new();
    params.insert("client_id", client_id.as_str());
    params.insert("scope", AUTH_SCOPES);

    let client = reqwest::Client::new();
    let response = client
        .post(&device_code_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Failed to request device code: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Device code request failed: {}", error_text));
    }

    let device_response: DeviceCodeResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse device code response: {}", e))?;

    // Store the device code and polling interval for later use
    let state = DeviceCodeState {
        device_code: device_response.device_code.clone(),
        interval: device_response.interval,
    };

    let mut state_guard = DEVICE_CODE_STATE.lock().await;
    *state_guard = Some(state);

    // Initialize the credential and store it in AUTH_CREDENTIAL
    let credential = InteractiveDeviceCodeCredential {
        client_id,
        tenant_id,
        cached_tokens: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        refresh_token: Arc::new(tokio::sync::RwLock::new(None)),
    };

    {
        let mut auth_lock = AUTH_CREDENTIAL.lock().await;
        *auth_lock = Some(Arc::new(credential));
        info!("InteractiveDeviceCodeCredential stored in global AUTH_CREDENTIAL");
    }

    Ok(DeviceCodeInfo {
        user_code: device_response.user_code,
        device_code: device_response.device_code,
        verification_uri: device_response.verification_uri,
        message: device_response.message,
    })
}

/// Complete interactive browser login by polling for token
///
/// This should be called after `start_interactive_browser_login` once
/// the user has completed authentication in their browser.
///
/// # Returns
///
/// Returns authentication result with user information.
pub async fn complete_interactive_browser_login() -> Result<AuthResult, String> {
    info!("Completing interactive browser login...");

    let credential = {
        let auth_lock = AUTH_CREDENTIAL.lock().await;
        auth_lock.clone().ok_or_else(|| {
            log_error!("complete_interactive_browser_login called but no AUTH_CREDENTIAL found");
            "No authentication flow in progress".to_string()
        })?
    };

    let token_response = credential
        .get_token(&["https://management.azure.com/.default"], None)
        .await
        .map_err(|e| {
            log_error!("Failed to complete authentication: {}", e);
            format!("{}", e)
        })?;

    // Clear device code state after successful authentication
    {
        let mut state_guard = DEVICE_CODE_STATE.lock().await;
        *state_guard = None;
    }

    store_auth_result(
        credential,
        token_response.token.secret(),
        "Interactive Browser Flow",
    )
    .await
}
