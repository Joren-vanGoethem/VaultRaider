//! Interactive browser authentication flow
//!
//! This module implements the OAuth 2.0 device code flow for interactive
//! browser-based authentication. This is the recommended authentication
//! method as it doesn't require storing secrets.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use azure_core::Error;
use azure_core::credentials::{AccessToken, Secret, TokenCredential, TokenRequestOptions};
use log::{error as log_error, info};
use time::OffsetDateTime;

use crate::azure::auth::state::{AUTH_CREDENTIAL, DEVICE_CODE_STATE};
use crate::azure::auth::token::store_auth_result;
use crate::azure::auth::types::{
    AuthResult, DeviceCodeInfo, DeviceCodeResponse, DeviceCodeState, TokenResponse,
};
use crate::config::{
    AUTH_SCOPES, CLIENT_ID, DEVICE_CODE_ENDPOINT, MAX_POLL_ATTEMPTS, POLL_SLOWDOWN_SECONDS,
    TENANT_ID, TOKEN_ENDPOINT,
};

/// Credential implementation for interactive device code flow
#[derive(Debug)]
struct InteractiveDeviceCodeCredential {
    client_id: String,
    tenant_id: String,
    access_token: Arc<tokio::sync::RwLock<Option<AccessToken>>>,
}

#[async_trait]
impl TokenCredential for InteractiveDeviceCodeCredential {
    async fn get_token(
        &self,
        scopes: &[&str],
        _options: Option<TokenRequestOptions<'_>>,
    ) -> azure_core::Result<AccessToken> {
        info!(
            "Getting token from InteractiveDeviceCodeCredential for scopes: {:?}",
            scopes
        );

        // Check if we already have a valid token
        {
            let token_lock = self.access_token.read().await;
            if let Some(token) = token_lock.as_ref() {
                if token.expires_on > OffsetDateTime::now_utc() {
                    return Ok(token.clone());
                }
            }
        }

        // If not, we try to poll for it
        let state = {
            let state_lock = DEVICE_CODE_STATE.lock().await;
            state_lock.clone().ok_or_else(|| {
                Error::with_message(
                    azure_core::error::ErrorKind::Other,
                    "No device code state found",
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

            let response = client
                .post(&url)
                .form(&[
                    ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
                    ("client_id", &self.client_id),
                    ("device_code", &state.device_code),
                    ("scope", &scopes.join(" ")),
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

                let expires_in = token_res.expires_in.unwrap_or(3600);
                let expires_on =
                    OffsetDateTime::now_utc() + std::time::Duration::from_secs(expires_in);
                let access_token =
                    AccessToken::new(Secret::new(token_res.access_token), expires_on);

                let mut token_lock = self.access_token.write().await;
                *token_lock = Some(access_token.clone());

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

    let device_code_url = format!(
        "{}/{}/oauth2/v2.0/devicecode",
        DEVICE_CODE_ENDPOINT, TENANT_ID
    );

    let mut params = HashMap::new();
    params.insert("client_id", CLIENT_ID);
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
        client_id: CLIENT_ID.to_string(),
        tenant_id: TENANT_ID.to_string(),
        access_token: Arc::new(tokio::sync::RwLock::new(None)),
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
