use log::{debug, error, info};

use crate::azure::auth::token::{get_token_for_scope, get_token_from_state};
use crate::azure::http::{fetch_all_paginated, AzureHttpClient};
use crate::azure::keyvault::constants::{
    create_keyvault_uri, get_keyvault_uri, KEYVAULT_TOKEN_SCOPE, MANAGEMENT_TOKEN_SCOPE,
};
use crate::azure::keyvault::secret::constants::get_secrets_uri;
use crate::azure::keyvault::types::{
    CreateVaultRequest, KeyVault, KeyVaultAccessCheck, Properties,
};

// https://learn.microsoft.com/en-us/rest/api/keyvault/secrets/get-secrets/get-secrets?view=rest-keyvault-secrets-2025-07-01&tabs=HTTP

/// Fetch all Key Vaults for a specific subscription
pub async fn get_keyvaults(subscription_id: &str) -> Result<Vec<KeyVault>, String> {
    info!("Fetching keyvaults for subscription: {}", subscription_id);

    let token = get_token_from_state().await.map_err(|e| {
        error!("Failed to get token from state: {}", e);
        e
    })?;

    debug!("Successfully retrieved authentication token");

    let client = AzureHttpClient::with_token(&token).map_err(|e| {
        error!("Failed to create HTTP client: {}", e);
        e.to_string()
    })?;

    let url = get_keyvault_uri(subscription_id);
    info!("Calling Azure API: {}", url);

    let kv_list = fetch_all_paginated::<KeyVault>(&url, &client)
        .await
        .map_err(|e| {
            error!("Failed to fetch keyvaults: {}", e);
            e.to_string()
        })?;

    info!("Successfully retrieved {} keyvault(s)", kv_list.len());
    Ok(kv_list)
}

/// Check if we have access to a specific Key Vault by attempting to list secrets
#[tauri::command]
pub async fn check_keyvault_access(keyvault_uri: &str) -> Result<KeyVaultAccessCheck, String> {
    info!("Checking access to Key Vault: {}", keyvault_uri);
    info!("Requesting token with scope: {}", KEYVAULT_TOKEN_SCOPE);

    // Try to get a token for the Key Vault data plane
    let token = match get_token_for_scope(KEYVAULT_TOKEN_SCOPE).await {
        Ok(t) => {
            info!("Successfully obtained token for Key Vault access");
            t
        }
        Err(e) => {
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
            return Ok(KeyVaultAccessCheck {
                vault_uri: keyvault_uri.to_string(),
                has_access: false,
                can_list_secrets: false,
                error_message: Some(format!("Failed to create client: {}", e)),
            });
        }
    };

    // Construct the secrets list URL
    let url = get_secrets_uri(keyvault_uri);

    // Try to list secrets - this will tell us if we have access
    match client.get_text(&url).await {
        Ok(_) => {
            info!("Successfully accessed Key Vault: {}", keyvault_uri);
            Ok(KeyVaultAccessCheck {
                vault_uri: keyvault_uri.to_string(),
                has_access: true,
                can_list_secrets: true,
                error_message: None,
            })
        }
        Err(e) => {
            info!("Access denied to Key Vault {}: {}", keyvault_uri, e);
            Ok(KeyVaultAccessCheck {
                vault_uri: keyvault_uri.to_string(),
                has_access: false,
                can_list_secrets: false,
                error_message: Some(e.to_string()),
            })
        }
    }
}

#[tauri::command]
pub async fn create_keyvault(
    subscription_id: &str,
    resource_group: &str,
    keyvault_name: &str,
) -> Result<KeyVault, String> {
    let url = create_keyvault_uri(subscription_id, resource_group, keyvault_name);

    let token = get_token_for_scope(MANAGEMENT_TOKEN_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let resource_group =
        crate::azure::resource_group::client::get_resource_group_by_name(subscription_id, resource_group)
            .await?;

    let body = CreateVaultRequest {
        location: resource_group.location,
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

    info!("Creating keyvault {}...", keyvault_name);

    let created_vault: KeyVault = client.put(&url, &body).await.map_err(|e| {
        error!("Failed to create keyvault: {}", e);
        e.to_string()
    })?;

    info!("Keyvault created: {}", keyvault_name);

    Ok(created_vault)
}
