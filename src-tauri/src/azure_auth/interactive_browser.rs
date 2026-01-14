use std::collections::HashMap;
use crate::azure_auth::constants::{AUTH_SCOPES, CLIENT_ID, DEVICE_CODE_ENDPOINT, MAX_POLL_ATTEMPTS, POLL_SLOWDOWN_SECONDS, TENANT_ID, TOKEN_ENDPOINT};
use crate::azure_auth::state::DEVICE_CODE_STATE;
use crate::azure_auth::token::extract_user_info_from_token;
use crate::azure_auth::types::{AuthResult, DeviceCodeInfo, DeviceCodeResponse, DeviceCodeState, TokenResponse};
use crate::azure_auth::user_info::store_user_info;

/// Start device code authentication flow
/// This is the recommended approach for desktop applications (no client secret needed)
pub async fn start_interactive_browser_login() -> Result<DeviceCodeInfo, String> {
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

    Ok(DeviceCodeInfo {
        user_code: device_response.user_code,
        device_code: device_response.device_code,
        verification_uri: device_response.verification_uri,
        message: device_response.message,
    })
}

/// Complete device code authentication by polling for token
/// Call this after user has entered the code on the verification URL
#[allow(unused_variables)]
pub async fn complete_interactive_browser_login(auth_code: String, state: String) -> Result<AuthResult, String> {
    // Retrieve the stored device code state
    let state_guard = DEVICE_CODE_STATE.lock().await;
    let device_state = state_guard.as_ref()
        .ok_or("No device code found. Please start the login flow first.")?;

    let device_code = device_state.device_code.clone();
    let interval = device_state.interval;
    drop(state_guard);

    // Prepare token endpoint
    let token_url = format!(
        "{}/{}/oauth2/v2.0/token",
        TOKEN_ENDPOINT, TENANT_ID
    );

    let mut params = HashMap::new();
    params.insert("client_id", CLIENT_ID);
    params.insert("grant_type", "urn:ietf:params:oauth:grant-type:device_code");
    params.insert("device_code", &device_code);

    let client = reqwest::Client::new();

    // Poll for token (up to MAX_POLL_ATTEMPTS times)
    for _ in 0..MAX_POLL_ATTEMPTS {
        let response = client
            .post(&token_url)
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("Token request failed: {}", e))?;

        if response.status().is_success() {
            let token_response: TokenResponse = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse token response: {}", e))?;

            // Extract and store user info from access token
            let (user_email, user_name) = extract_user_info_from_token(&token_response.access_token)
                .unwrap_or((None, None));

            store_user_info(user_email.clone(), user_name.clone()).await;

            // Clear device code state after successful authentication
            let mut state_guard = DEVICE_CODE_STATE.lock().await;
            *state_guard = None;

            return Ok(AuthResult {
                success: true,
                message: "Successfully authenticated with device code!".to_string(),
                user_email,
                user_name,
            });
        }

        // Handle polling errors
        let error_text = response.text().await.unwrap_or_default();

        if error_text.contains("authorization_pending") {
            // User hasn't completed authentication yet, continue polling
            tokio::time::sleep(tokio::time::Duration::from_secs(interval)).await;
        } else if error_text.contains("slow_down") {
            // Azure requests slower polling
            tokio::time::sleep(tokio::time::Duration::from_secs(interval + POLL_SLOWDOWN_SECONDS)).await;
        } else {
            // Authentication failed with an error
            return Err(format!("Authentication failed: {}", error_text));
        }
    }

    Err("Authentication timed out. Please try again.".to_string())
}