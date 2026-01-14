use crate::azure_auth::cli::try_azure_cli_login;
use crate::azure_auth::service_principal::try_environment_credential;
use crate::azure_auth::state::AUTH_CREDENTIAL;
use crate::azure_auth::types::AuthResult;
use crate::azure_auth::user_info::USER_INFO;

/// Try to authenticate with the best available method
/// First tries Azure CLI, then falls back to environment-based authentication (Service Principal)
pub async fn login() -> Result<AuthResult, String> {
    // First, try Azure CLI authentication
    match try_azure_cli_login().await {
        Ok(result) => {
            println!("Successfully authenticated with Azure CLI");
            return Ok(result);
        }
        Err(cli_error) => {
            println!("Azure CLI authentication failed: {}", cli_error);
            println!("Falling back to Service Principal authentication...");

            // Fall back to Service Principal authentication via environment variables
            match try_environment_credential().await {
                Ok(result) => Ok(result),
                Err(env_error) => {
                    Err(format!(
                        "All authentication methods failed.\n\nAzure CLI: {}\n\nService Principal: {}\n\nPlease either:\n1. Run 'az login' in your terminal, or\n2. Set AZURE_CLIENT_SECRET environment variable for Service Principal auth",
                        cli_error, env_error
                    ))
                }
            }
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