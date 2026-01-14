use crate::azure_auth::service_principal::try_environment_credential;
use crate::azure_auth::types::{AuthResult, DeviceCodeInfo};

/// Initiates Azure authentication using an environment-based approach
/// This provides instructions for setting up alternative authentication
pub async fn start_device_code_login() -> Result<DeviceCodeInfo, String> {
    // Provide instructions for alternative authentication methods
    Ok(DeviceCodeInfo {
        user_code: "N/A".to_string(),
        device_code: "N/A".to_string(),
        verification_uri: "https://portal.azure.com".to_string(),
        message: "Alternative authentication methods:\n1. Azure CLI: Run 'az login' in your terminal\n2. Service Principal: Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID environment variables\n\nThen click Login again.".to_string(),
    })
}

/// Complete the authentication flow
/// This tries environment-based authentication (Service Principal)
pub async fn complete_device_code_login() -> Result<AuthResult, String> {
    try_environment_credential().await
}