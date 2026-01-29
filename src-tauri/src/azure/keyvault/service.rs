//! Key Vault service - business logic for Azure Key Vault operations

use tracing::{debug, error, info, instrument, Span};

use crate::azure::auth::token::{get_token_for_scope, get_token_from_state};
use crate::azure::http::{fetch_all_paginated, AzureHttpClient};
use crate::azure::resource_group::service::get_resource_group_by_name;
use crate::config::{urls, KEYVAULT_SCOPE, MANAGEMENT_SCOPE};

use super::types::{CreateVaultRequest, KeyVault, KeyVaultAccessCheck, Properties};

/// Fetch all Key Vaults for a specific subscription.
///
/// # Arguments
///
/// * `subscription_id` - The Azure subscription ID
///
/// # Returns
///
/// A vector of Key Vault objects or an error.
#[instrument(
    name = "keyvault.list",
    skip(subscription_id),
    fields(
        subscription_id = %subscription_id,
        vault_count = tracing::field::Empty,
        otel.kind = "client",
    )
)]
pub async fn get_keyvaults(subscription_id: &str) -> Result<Vec<KeyVault>, String> {
    info!("Fetching keyvaults");

    let token = get_token_from_state().await.map_err(|e| {
        error!(error = %e, "Failed to get token from state");
        e
    })?;

    debug!("Successfully retrieved authentication token");

    let client = AzureHttpClient::with_token(&token).map_err(|e| {
        error!(error = %e, "Failed to create HTTP client");
        e.to_string()
    })?;

    let url = urls::keyvaults(subscription_id);
    debug!(url = %url, "Calling Azure API");

    let kv_list = fetch_all_paginated::<KeyVault>(&url, &client)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch keyvaults");
            e.to_string()
        })?;

    // Record the count in the span for observability
    Span::current().record("vault_count", kv_list.len());
    info!(count = kv_list.len(), "Successfully retrieved keyvaults");
    
    Ok(kv_list)
}

/// Check if we have access to a specific Key Vault by attempting to list secrets.
///
/// # Arguments
///
/// * `keyvault_uri` - The Key Vault URI (e.g., https://myvault.vault.azure.net)
///
/// # Returns
///
/// Access check result indicating whether we can access the vault.
#[instrument(
    name = "keyvault.check_access",
    skip(keyvault_uri),
    fields(
        keyvault.uri = %keyvault_uri,
        has_access = tracing::field::Empty,
        otel.kind = "client",
    )
)]
pub async fn check_keyvault_access(keyvault_uri: &str) -> Result<KeyVaultAccessCheck, String> {
    info!("Checking access to Key Vault");
    debug!(scope = %KEYVAULT_SCOPE, "Requesting token");

    // Try to get a token for the Key Vault data plane
    let token = match get_token_for_scope(KEYVAULT_SCOPE).await {
        Ok(t) => {
            debug!("Successfully obtained token for Key Vault access");
            t
        }
        Err(e) => {
            Span::current().record("has_access", false);
            return Ok(KeyVaultAccessCheck {
                vault_uri: keyvault_uri.to_string(),
                has_access: false,
                can_list_secrets: false,
                error_message: Some(format!("Failed to get token: {}", e)),
            });
        }
    };

    let client = match AzureHttpClient::with_token(&token) {
        Ok(c) => c,
        Err(e) => {
            Span::current().record("has_access", false);
            return Ok(KeyVaultAccessCheck {
                vault_uri: keyvault_uri.to_string(),
                has_access: false,
                can_list_secrets: false,
                error_message: Some(format!("Failed to create client: {}", e)),
            });
        }
    };

    // Construct the secrets list URL
    let url = urls::secrets(keyvault_uri);

    // Try to list secrets - this will tell us if we have access
    match client.get_text(&url).await {
        Ok(_) => {
            Span::current().record("has_access", true);
            info!("Successfully accessed Key Vault");
            Ok(KeyVaultAccessCheck {
                vault_uri: keyvault_uri.to_string(),
                has_access: true,
                can_list_secrets: true,
                error_message: None,
            })
        }
        Err(e) => {
            Span::current().record("has_access", false);
            info!(error = %e, "Access denied to Key Vault");
            Ok(KeyVaultAccessCheck {
                vault_uri: keyvault_uri.to_string(),
                has_access: false,
                can_list_secrets: false,
                error_message: Some(e.to_string()),
            })
        }
    }
}

/// Create a new Key Vault.
///
/// # Arguments
///
/// * `subscription_id` - The Azure subscription ID
/// * `resource_group` - The resource group name
/// * `keyvault_name` - The name for the new Key Vault
///
/// # Returns
///
/// The created Key Vault object or an error.
#[instrument(
    name = "keyvault.create",
    skip(subscription_id, resource_group, keyvault_name),
    fields(
        subscription_id = %subscription_id,
        resource_group = %resource_group,
        keyvault.name = %keyvault_name,
        otel.kind = "client",
    )
)]
pub async fn create_keyvault(
    subscription_id: &str,
    resource_group: &str,
    keyvault_name: &str,
) -> Result<KeyVault, String> {
    let url = urls::keyvault(subscription_id, resource_group, keyvault_name);

    let token = get_token_for_scope(MANAGEMENT_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let rg = get_resource_group_by_name(subscription_id, resource_group).await?;

    let body = CreateVaultRequest {
        location: rg.location,
        properties: Properties {
            access_policies: vec![],
            create_mode: None,
            enable_purge_protection: None,
            enable_rbac_authorization: false,
            enable_soft_delete: false,
            enabled_for_deployment: false,
            enabled_for_disk_encryption: None,
            enabled_for_template_deployment: None,
            hsm_pool_resource_id: None,
            network_acls: None,
            private_endpoint_connections: None,
            provisioning_state: "".to_string(),
            public_network_access: "".to_string(),
            sku: Default::default(),
            soft_delete_retention_in_days: None,
            tenant_id: "".to_string(),
            vault_uri: "".to_string(),
        },
    };

    info!("Creating keyvault");

    let created_vault: KeyVault = client.put(&url, &body).await.map_err(|e| {
        error!(error = %e, "Failed to create keyvault");
        e.to_string()
    })?;

    info!(vault_id = %created_vault.id, "Keyvault created successfully");

    Ok(created_vault)
}
