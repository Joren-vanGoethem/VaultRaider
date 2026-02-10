use crate::azure::auth::constants::VAULT_SCOPE;
use crate::azure::auth::token::store_auth_result;
use crate::azure::auth::types::AuthResult;
use azure_core::credentials::TokenCredential;
use azure_identity::{AzureCliCredential, AzureCliCredentialOptions};

/// Initiates Azure authentication using Azure CLI
/// Note: This requires the user to be logged in via Azure CLI (az login)
pub async fn try_azure_cli_login() -> Result<AuthResult, String> {
    // Use default options - let Azure CLI use its own context
    // Don't override tenant_id as the CLI already knows which tenant the user logged into
    let options = AzureCliCredentialOptions::default();

    let credential = AzureCliCredential::new(Some(options))
        .map_err(|e| format!("Failed to create Azure CLI credential: {}", e))?;

    // Try to get a token to verify authentication
    let scopes = &[VAULT_SCOPE];
    let token = credential
        .get_token(scopes, None)
        .await
        .map_err(|e| format!("Azure CLI authentication failed: {}", e))?;

    store_auth_result(credential, token.token.secret(), "Azure CLI").await
}
