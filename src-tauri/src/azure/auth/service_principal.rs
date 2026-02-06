use crate::azure::auth::constants::{CLIENT_ID, TENANT_ID, VAULT_SCOPE};
use crate::azure::auth::token::store_auth_result;
use crate::azure::auth::types::AuthResult;
use azure_core::credentials::{Secret, TokenCredential};
use azure_identity::{ClientSecretCredential, ClientSecretCredentialOptions};
use log::info;
use std::env;

/// Initiates Azure authentication using environment variables
/// This tries to authenticate using AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID
/// environment variables (Service Principal authentication)
pub async fn try_environment_credential() -> Result<AuthResult, String> {
    info!("try_environment_credential...");

    // Check if environment variables are set
    let client_id = env::var("AZURE_CLIENT_ID")
        .or_else(|_| Ok::<String, std::env::VarError>(CLIENT_ID.to_string()))
        .map_err(|e| format!("AZURE_CLIENT_ID not set: {}", e))?;

    let client_secret = env::var("AZURE_CLIENT_SECRET")
        .map_err(|_| "AZURE_CLIENT_SECRET environment variable not set".to_string())?;

    let tenant_id = env::var("AZURE_TENANT_ID")
        .or_else(|_| Ok::<String, std::env::VarError>(TENANT_ID.to_string()))
        .map_err(|e| format!("AZURE_TENANT_ID not set: {}", e))?;

    let options = ClientSecretCredentialOptions::default();

    let credential = ClientSecretCredential::new(
        &client_id,
        tenant_id,
        Secret::new(client_secret),
        Some(options),
    )
    .map_err(|e| format!("Failed to create client secret credential: {}", e))?;

    // Try to get a token to verify authentication
    let scopes = &[VAULT_SCOPE];
    let token = credential
        .get_token(scopes, None)
        .await
        .map_err(|e| format!("Service Principal authentication failed: {}", e))?;

    store_auth_result(credential, token.token.secret(), "Service Principal").await
}
