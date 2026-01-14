use std::sync::Arc;
use azure_core::credentials::TokenCredential;
use crate::azure_auth::state::AUTH_CREDENTIAL;
use crate::azure_auth::types::{AuthResult, TokenClaims};
use crate::azure_auth::user_info::store_user_info;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;

/// Decode JWT token without verification to extract user info
pub fn extract_user_info_from_token(token: &str) -> Result<(Option<String>, Option<String>), String> {
    // Split the JWT token (format: header.payload.signature)
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err("Invalid token format".to_string());
    }

    // Decode the payload (second part)
    let payload = parts[1];

    // JWT uses base64url encoding, need to handle padding
    let padding_needed = (4 - payload.len() % 4) % 4;
    let padded_payload = format!("{}{}", payload, "=".repeat(padding_needed));

    let decoded = BASE64
        .decode(padded_payload.as_bytes())
        .map_err(|e| format!("Failed to decode token: {}", e))?;

    let claims: TokenClaims = serde_json::from_slice(&decoded)
        .map_err(|e| format!("Failed to parse token claims: {}", e))?;

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
    let (user_email, user_name) = extract_user_info_from_token(token_secret)
        .unwrap_or((None, None));

    // Store the credential
    let mut cred = AUTH_CREDENTIAL.lock().await;
    *cred = Some(credential);

    // Store user info
    store_user_info(user_email.clone(), user_name.clone()).await;

    Ok(AuthResult {
        success: true,
        message: format!("Successfully authenticated with {}!", auth_method),
        user_email,
        user_name,
    })
}

