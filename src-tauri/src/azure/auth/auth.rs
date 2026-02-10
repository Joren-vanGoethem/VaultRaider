use crate::azure::auth::cli::try_azure_cli_login;
use crate::azure::auth::service_principal::try_environment_credential;
use crate::azure::auth::state::AUTH_CREDENTIAL;
use crate::azure::auth::types::AuthResult;
use crate::azure::auth::user_info::USER_INFO;
use log::{error, info};

/// Try to authenticate with the best available method
/// First tries Azure CLI, then falls back to environment-based authentication (Service Principal)
pub async fn login() -> Result<AuthResult, String> {
    info!("Starting generic login flow...");
    // First, try Azure CLI authentication
    match try_azure_cli_login().await {
        Ok(result) => {
            info!("Successfully authenticated with Azure CLI");
            return Ok(result);
        }
        Err(cli_error) => {
            info!("Azure CLI authentication failed: {}", cli_error);
            info!("Falling back to Service Principal authentication...");

            // Fall back to Service Principal authentication via environment variables
            match try_environment_credential().await {
                Ok(result) => Ok(result),
                Err(env_error) => {
                    error!("Service Principal authentication failed: {}", env_error);
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
    log::info!("Logging out, clearing AUTH_CREDENTIAL");
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
