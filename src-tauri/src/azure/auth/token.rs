use crate::azure::auth::provider::{GlobalTokenProvider, TokenProvider};
use crate::azure::auth::state::AUTH_CREDENTIAL;
use crate::azure::auth::types::{AuthResult, TokenClaims};
use crate::azure::auth::user_info::store_user_info;
use azure_core::credentials::TokenCredential;
use base64::engine::general_purpose::URL_SAFE_NO_PAD as BASE64URL;
use base64::Engine;
use log::{error, info, warn};
use std::sync::Arc;

/// Get a token for Azure Resource Management API.
///
/// This is a backwards-compatible wrapper around `GlobalTokenProvider`.
pub async fn get_token_from_state() -> Result<String, String> {
    let provider = GlobalTokenProvider::new();
    provider
        .get_management_token()
        .await
        .map_err(|e| e.to_string())
}

/// Get a token for a specific scope.
///
/// This is a backwards-compatible wrapper around `GlobalTokenProvider`.
pub async fn get_token_for_scope(scope: &str) -> Result<String, String> {
    let provider = GlobalTokenProvider::new();
    provider
        .get_token_for_scope(scope)
        .await
        .map_err(|e| e.to_string())
}

/// Decode JWT token without verification to extract user info.
pub fn extract_user_info_from_token(
    token: &str,
) -> Result<(Option<String>, Option<String>), String> {
    // Check if this looks like a JWT (has 3 dot-separated parts)
    let parts: Vec<&str> = token.split('.').collect();

    if parts.len() != 3 {
        // Not a standard JWT format
        info!("Token is not a JWT format - user info will be fetched separately");
        return Ok((None, None));
    }

    // Decode the payload (second part)
    let payload = parts[1];

    let decoded = match BASE64URL.decode(payload.as_bytes()) {
        Ok(d) => d,
        Err(e) => {
            // Try standard base64 as fallback
            match base64::engine::general_purpose::STANDARD.decode(payload.as_bytes()) {
                Ok(d) => d,
                Err(_) => {
                    warn!("Failed to decode token payload: {}", e);
                    return Ok((None, None));
                }
            }
        }
    };

    let claims: TokenClaims = match serde_json::from_slice(&decoded) {
        Ok(c) => c,
        Err(e) => {
            warn!("Failed to parse token claims: {}", e);
            return Ok((None, None));
        }
    };

    // Try to get email from various possible fields (ordered by preference)
    let email = claims
        .upn
        .or(claims.email)
        .or(claims.unique_name)
        .or(claims.preferred_username);

    Ok((email, claims.name))
}

/// Extracts user info from token and stores credential
pub async fn store_auth_result(
    credential: Arc<dyn TokenCredential>,
    token_secret: &str,
    auth_method: &str,
) -> Result<AuthResult, String> {
    info!("Storing authentication result for method: {}", auth_method);
    let (user_email, user_name) = match extract_user_info_from_token(token_secret) {
        Ok((email, name)) => {
            info!("Extracted user info: email={:?}, name={:?}", email, name);
            (email, name)
        }
        Err(e) => {
            warn!("Failed to extract user info from token: {}", e);
            (None, None)
        }
    };

    // Store the credential
    {
        let mut cred = AUTH_CREDENTIAL.lock().await;
        *cred = Some(credential);
        info!(
            "Credential stored in global AUTH_CREDENTIAL. Type: {}. Is Some: {}",
            auth_method,
            cred.is_some()
        );
    }

    // Store user info
    store_user_info(user_email.clone(), user_name.clone()).await;

    Ok(AuthResult {
        success: true,
        message: format!("Successfully authenticated with {}!", auth_method),
        user_email,
        user_name,
    })
}
