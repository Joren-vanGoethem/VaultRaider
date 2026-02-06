use crate::azure::auth::constants::{
    AUTH_SCOPES, CLIENT_ID, DEVICE_CODE_ENDPOINT, TENANT_ID, TOKEN_ENDPOINT,
};
use crate::azure::auth::state::{AUTH_CREDENTIAL, DEVICE_CODE_STATE};
use crate::azure::auth::token::store_auth_result;
use crate::azure::auth::types::{
    AuthResult, DeviceCodeInfo, DeviceCodeResponse, DeviceCodeState, TokenResponse,
};
use async_trait::async_trait;
use azure_core::Error;
use azure_core::credentials::{AccessToken, Secret, TokenCredential, TokenRequestOptions};
use std::sync::Arc;
use time::OffsetDateTime;

#[derive(Debug)]
struct ManualDeviceCodeCredential {
    client_id: String,
    tenant_id: String,
    access_token: Arc<tokio::sync::RwLock<Option<AccessToken>>>,
}

use log::{error, info, warn};

#[async_trait]
impl TokenCredential for ManualDeviceCodeCredential {
    async fn get_token(
        &self,
        scopes: &[&str],
        _options: Option<TokenRequestOptions<'_>>,
    ) -> azure_core::Result<AccessToken> {
        info!(
            "get token from ManualDeviceCodeCredential for scopes: {:?}",
            scopes
        );
        // Check if we already have a valid token
        {
            let token_lock = self.access_token.read().await;
            if let Some(token) = token_lock.as_ref() {
                if token.expires_on > OffsetDateTime::now_utc() {
                    // Note: In a real implementation, we should check if the token matches the requested scopes.
                    // For now, we assume the token we have is valid for the requested scope if it's not expired.
                    info!(
                        "Existing token found and valid until {:?}, returning it",
                        token.expires_on
                    );
                    return Ok(token.clone());
                }
                warn!("Existing token expired at {:?}", token.expires_on);
            }
        }

        // If not, we try to poll for it (this assumes the user has started the flow)
        let state = {
            let state_lock = DEVICE_CODE_STATE.lock().await;
            state_lock.clone().ok_or_else(|| {
                error!("No device code state found in global state");
                Error::with_message(
                    azure_core::error::ErrorKind::Other,
                    "No device code state found",
                )
            })?
        };

        info!(
            "Polling Azure for token using device code: {}",
            state.device_code
        );
        let client = reqwest::Client::new();
        let url = format!("{}/{}/oauth2/v2.0/token", TOKEN_ENDPOINT, self.tenant_id);

        let mut attempts = 0;
        let max_attempts = 60; // 5 minutes with 5s interval

        loop {
            if attempts >= max_attempts {
                error!("Authentication timed out after {} attempts", attempts);
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
                    error!("Failed to send token poll request: {}", e);
                    Error::with_message(azure_core::error::ErrorKind::Io, e.to_string())
                })?;

            if response.status().is_success() {
                info!("Successfully received token from Azure");
                let token_res: TokenResponse = response.json().await.map_err(|e| {
                    error!("Failed to parse token response: {}", e);
                    Error::with_message(azure_core::error::ErrorKind::DataConversion, e.to_string())
                })?;

                let expires_in = token_res.expires_in.unwrap_or(3600);
                let expires_on =
                    OffsetDateTime::now_utc() + std::time::Duration::from_secs(expires_in);
                let access_token_str = token_res.access_token;
                let access_token =
                    AccessToken::new(Secret::new(access_token_str.clone()), expires_on);

                let mut token_lock = self.access_token.write().await;
                *token_lock = Some(access_token.clone());

                info!(
                    "Token stored in credential state, valid until {:?}. Token secret: {}...",
                    expires_on,
                    &access_token_str[..10]
                );
                return Ok(access_token);
            } else {
                let status = response.status();
                let error_json: serde_json::Value = response.json().await.unwrap_or_default();
                let error_code = error_json["error"].as_str().unwrap_or("");

                if error_code == "authorization_pending" {
                    attempts += 1;
                    if attempts % 5 == 0 {
                        info!(
                            "Still waiting for user to complete authentication (attempt {})...",
                            attempts
                        );
                    }
                    tokio::time::sleep(std::time::Duration::from_secs(state.interval)).await;
                } else {
                    error!(
                        "Authentication failed with status {}: {} - {}",
                        status,
                        error_code,
                        error_json["error_description"].as_str().unwrap_or("")
                    );
                    return Err(Error::with_message(
                        azure_core::error::ErrorKind::Other,
                        format!("Authentication failed: {}", error_code),
                    ));
                }
            }
        }
    }
}

/// Initiates Azure authentication using Device Code Flow
pub async fn start_device_code_login() -> Result<DeviceCodeInfo, String> {
    info!("Starting device code login flow...");
    let client = reqwest::Client::new();
    let url = format!(
        "{}/{}/oauth2/v2.0/devicecode",
        DEVICE_CODE_ENDPOINT, TENANT_ID
    );

    info!(
        "Requesting device code from: {} with scope: {}",
        url, AUTH_SCOPES
    );
    let response = client
        .post(&url)
        .form(&[("client_id", CLIENT_ID), ("scope", AUTH_SCOPES)])
        .send()
        .await
        .map_err(|e| {
            error!("Failed to send device code request: {}", e);
            format!("Failed to send device code request: {}", e)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        error!(
            "Device code request failed with status {}: {}",
            status, error_text
        );
        return Err(format!("Device code request failed: {}", error_text));
    }

    let device_code_res: DeviceCodeResponse = response.json().await.map_err(|e| {
        error!("Failed to parse device code response: {}", e);
        format!("Failed to parse device code response: {}", e)
    })?;

    info!("Device code received: {}", device_code_res.user_code);

    // Store the state so we can complete the login later
    {
        let mut state_lock = DEVICE_CODE_STATE.lock().await;
        *state_lock = Some(DeviceCodeState {
            device_code: device_code_res.device_code.clone(),
            interval: device_code_res.interval,
        });
        info!("Stored device code state for polling");
    }

    // Store the manual credential
    let credential = ManualDeviceCodeCredential {
        client_id: CLIENT_ID.to_string(),
        tenant_id: TENANT_ID.to_string(),
        access_token: Arc::new(tokio::sync::RwLock::new(None)),
    };

    {
        let mut auth_lock = AUTH_CREDENTIAL.lock().await;
        *auth_lock = Some(Arc::new(credential));
        info!(
            "ManualDeviceCodeCredential stored in global AUTH_CREDENTIAL. Is Some: {}",
            auth_lock.is_some()
        );

        // Final verification after setting it
        if auth_lock.is_some() {
            info!("AUTH_CREDENTIAL successfully set in start_device_code_login");
        } else {
            error!(
                "CRITICAL: AUTH_CREDENTIAL is STILL NONE after setting it in start_device_code_login!"
            );
        }
    }

    Ok(DeviceCodeInfo {
        user_code: device_code_res.user_code,
        device_code: device_code_res.device_code,
        verification_uri: device_code_res.verification_uri,
        message: device_code_res.message,
    })
}

/// Complete the authentication flow
pub async fn complete_device_code_login() -> Result<AuthResult, String> {
    info!("Completing device code login (polling for final token)...");
    let credential = {
        let auth_lock = AUTH_CREDENTIAL.lock().await;
        info!(
            "AUTH_CREDENTIAL state in complete_device_code_login: Is Some: {}",
            auth_lock.is_some()
        );
        auth_lock.clone().ok_or_else(|| {
            error!("complete_device_code_login called but no AUTH_CREDENTIAL found");
            "No authentication flow in progress"
        })?
    };

    info!("Calling get_token on credential to start/finish polling...");
    let token_response = credential
        .get_token(&["https://management.azure.com/.default"], None)
        .await
        .map_err(|e| {
            error!("Failed to complete authentication: {}", e);
            format!("{}", e)
        })?;

    info!("Authentication complete, extracting user info from token and storing result");
    store_auth_result(
        credential,
        token_response.token.secret(),
        "Device Code Flow",
    )
    .await
}
