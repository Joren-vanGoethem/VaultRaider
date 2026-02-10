//! Authentication service - core authentication logic
//!
//! This module provides the main authentication functions that coordinate
//! between different authentication methods (CLI, Service Principal, etc.)

use crate::azure::auth::cli::try_azure_cli_login;
use crate::azure::auth::service_principal::try_environment_credential;
use crate::azure::auth::state::AUTH_CREDENTIAL;
use crate::azure::auth::types::AuthResult;
use crate::azure::auth::user_info::USER_INFO;
use log::{error, info};

/// Try to authenticate with the best available method.
///
/// This function attempts authentication in the following order:
/// 1. Azure CLI credentials (if `az login` has been run)
/// 2. Service Principal via environment variables
///
/// # Returns
///
/// Returns `Ok(AuthResult)` on successful authentication, or an error
/// describing which methods failed.
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
                        "All authentication methods failed.\n\n\
                        Azure CLI: {}\n\n\
                        Service Principal: {}\n\n\
                        Please either:\n\
                        1. Run 'az login' in your terminal, or\n\
                        2. Set AZURE_CLIENT_SECRET environment variable for Service Principal auth",
                        cli_error, env_error
                    ))
                }
            }
        }
    }
}

/// Check if user is currently authenticated.
///
/// # Returns
///
/// Returns `true` if valid credentials are stored, `false` otherwise.
pub async fn is_authenticated() -> bool {
    let cred = AUTH_CREDENTIAL.lock().await;
    cred.is_some()
}

/// Logout and clear all stored credentials.
///
/// This clears both the authentication credential and any cached user info.
pub async fn logout() {
    info!("Logging out, clearing AUTH_CREDENTIAL");

    let mut cred = AUTH_CREDENTIAL.lock().await;
    *cred = None;

    let mut user_info = USER_INFO.lock().await;
    *user_info = None;
}

/// Get the current user's information.
///
/// # Returns
///
/// Returns `Some((email, name))` if user info is available, `None` otherwise.
pub async fn get_user_info() -> Option<(String, Option<String>)> {
    let user_info = USER_INFO.lock().await;
    user_info.clone()
}
