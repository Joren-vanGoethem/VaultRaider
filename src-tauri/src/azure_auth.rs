use azure_identity::{AzureCliCredential, AzureCliCredentialOptions};
use azure_core::credentials::TokenCredential;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

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
}

// Global state to hold the credential
lazy_static::lazy_static! {
    pub static ref AUTH_CREDENTIAL: Arc<Mutex<Option<Arc<dyn TokenCredential>>>> =
        Arc::new(Mutex::new(None));
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
        Ok(_token) => {
            // Store the credential for future use
            // Note: credential is already Arc<AzureCliCredential> from new()
            let mut cred = AUTH_CREDENTIAL.lock().await;
            *cred = Some(credential);

            Ok(AuthResult {
                success: true,
                message: "Successfully authenticated with Azure CLI!".to_string(),
                user_email: None, // We can parse this from the token if needed
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
}

