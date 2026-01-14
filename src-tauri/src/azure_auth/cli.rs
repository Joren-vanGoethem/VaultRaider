use azure_core::credentials::TokenCredential;
use azure_identity::{AzureCliCredential, AzureCliCredentialOptions};
use crate::azure_auth::constants::{TENANT_ID, VAULT_SCOPE};
use crate::azure_auth::token::store_auth_result;
use crate::azure_auth::types::AuthResult;

/// Initiates Azure authentication using Azure CLI
/// Note: This requires the user to be logged in via Azure CLI (az login)
pub async fn try_azure_cli_login() -> Result<AuthResult, String> {
    // Create Azure CLI credential with tenant ID
    let mut options = AzureCliCredentialOptions::default();
    options.tenant_id = Some(TENANT_ID.to_string());

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
