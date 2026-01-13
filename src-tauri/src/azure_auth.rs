use azure_identity::{AzureCliCredential, AzureCliCredentialOptions};
use azure_core::credentials::TokenCredential;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;

// Azure configuration
const CLIENT_ID: &str = "d904e24e-ef24-4c0c-b361-597ec4ef69cf"; // Replace with your App Registration Client ID
const TENANT_ID: &str = "8948bc3d-2462-4abf-b447-84b07161f34e"; // Replace with your Tenant ID

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCodeInfo {
    pub user_code: String,
    pub device_code: String,
    pub verification_uri: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResult {
    pub success: bool,
    pub message: String,
    pub user_email: Option<String>,
    pub user_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TokenClaims {
    #[serde(default)]
    upn: Option<String>, // User Principal Name (email)
    #[serde(default)]
    email: Option<String>,
    #[serde(default)]
    unique_name: Option<String>,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    preferred_username: Option<String>,
}

// Global state to hold the credential and user info
lazy_static::lazy_static! {
    pub static ref AUTH_CREDENTIAL: Arc<Mutex<Option<Arc<dyn TokenCredential>>>> =
        Arc::new(Mutex::new(None));
    pub static ref USER_INFO: Arc<Mutex<Option<(String, Option<String>)>>> =
        Arc::new(Mutex::new(None)); // (email, name)
}

/// Decode JWT token without verification to extract user info
fn extract_user_info_from_token(token: &str) -> Result<(Option<String>, Option<String>), String> {
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

    let decoded = BASE64.decode(padded_payload.as_bytes())
        .map_err(|e| format!("Failed to decode token: {}", e))?;

    let claims: TokenClaims = serde_json::from_slice(&decoded)
        .map_err(|e| format!("Failed to parse token claims: {}", e))?;

    // Try to get email from various possible fields
    let email = claims.upn
        .or(claims.email)
        .or(claims.unique_name)
        .or(claims.preferred_username);

    let name = claims.name;

    Ok((email, name))
}

/// Initiates Azure authentication using Azure CLI
/// Note: This requires the user to be logged in via Azure CLI (az login)
/// For a GUI-based device code flow, you would need to implement a custom credential
/// or use the interactive browser flow
pub async fn start_device_code_login() -> Result<AuthResult, String> {
    // Create Azure CLI credential with tenant ID
    let mut options = AzureCliCredentialOptions::default();
    options.tenant_id = Some(TENANT_ID.to_string());

    let credential = AzureCliCredential::new(Some(options))
        .map_err(|e| format!("Failed to create Azure CLI credential: {}", e))?;

    // Try to get a token to verify authentication
    let scopes = &["https://vault.azure.net/.default"];
    match credential.get_token(scopes, None).await {
        Ok(token) => {
            // Extract user info from token
            let (user_email, user_name) = extract_user_info_from_token(token.token.secret())
                .unwrap_or((None, None));

            // Store the credential for future use
            let mut cred = AUTH_CREDENTIAL.lock().await;
            *cred = Some(credential);

            // Store user info
            if let Some(ref email) = user_email {
                let mut user_info = USER_INFO.lock().await;
                *user_info = Some((email.clone(), user_name.clone()));
            }

            Ok(AuthResult {
                success: true,
                message: "Successfully authenticated with Azure CLI!".to_string(),
                user_email,
                user_name,
            })
        }
        Err(e) => {
            Err(format!("Authentication failed: {}. Please ensure you are logged in via Azure CLI (az login) with the correct tenant.", e))
        }
    }
}

/// Check if user is currently authenticated
pub async fn is_authenticated() -> bool {
    let cred = AUTH_CREDENTIAL.lock().await;
    cred.is_some()
}

/// Logout and clear credentials
pub async fn logout() {
    let mut cred = AUTH_CREDENTIAL.lock().await;
    *cred = None;

    let mut user_info = USER_INFO.lock().await;
    *user_info = None;
}

/// Get current user info
pub async fn get_user_info() -> Option<(String, Option<String>)> {
    let user_info = USER_INFO.lock().await;
    user_info.clone()
}

