use std::sync::Arc;
use azure_core::credentials::TokenCredential;
use crate::azure::auth::state::AUTH_CREDENTIAL;
use crate::azure::auth::types::{AuthResult, TokenClaims};
use crate::azure::auth::user_info::store_user_info;
use base64::engine::general_purpose::URL_SAFE_NO_PAD as BASE64URL;
use base64::Engine;

pub async fn get_token_from_state() -> Result<String, String> {
    let credential = {
        let cred_lock = AUTH_CREDENTIAL.lock().await;
        cred_lock
          .clone()
          .ok_or("Not authenticated. Please login first.")?
    };

    // Get a token for the Azure Management API
    let token_response = credential
      .get_token(&[crate::azure::keyvault::constants::TOKEN_URI], None)
      .await
      .map_err(|e| format!("Failed to get token: {}", e))?;

    Ok(token_response.token.secret().parse().unwrap())
}

/// Decode JWT token without verification to extract user info
pub fn extract_user_info_from_token(token: &str) -> Result<(Option<String>, Option<String>), String> {
    // Split the JWT token (format: header.payload.signature)
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err("Invalid token format".to_string());
    }

    // Decode the payload (second part)
    let payload = parts[1];

    let decoded = BASE64URL
        .decode(payload.as_bytes())
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


use log::{info, warn, error};

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
        info!("Credential stored in global AUTH_CREDENTIAL. Type: {}. Is Some: {}", auth_method, cred.is_some());
        
        // Verify it's actually there
        if cred.is_some() {
            info!("AUTH_CREDENTIAL verification: Some");
        } else {
            error!("AUTH_CREDENTIAL verification: None! This should not happen.");
        }
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

