//! Configuration-related Tauri commands

use crate::user_config::{get_client_id, get_config, get_tenant_id, update_config, UserConfig, MULTI_TENANT_ENDPOINT, VAULTRAIDER_CLIENT_ID};

/// Azure configuration returned to the frontend
#[derive(serde::Serialize, serde::Deserialize)]
pub struct AzureConfig {
    /// User-configured client ID (None means using VaultRaider's app)
    pub client_id: Option<String>,
    /// User-configured tenant ID (None means using multi-tenant auth)
    pub tenant_id: Option<String>,
    /// The effective client ID being used
    pub effective_client_id: String,
    /// The effective tenant ID being used
    pub effective_tenant_id: String,
    /// VaultRaider's default client ID (for display purposes)
    pub default_client_id: String,
    /// Default multi-tenant endpoint (for display purposes)
    pub default_tenant_id: String,
}

/// Get the current Azure configuration
#[tauri::command]
pub async fn get_azure_config() -> Result<AzureConfig, String> {
    let config = get_config().await;
    let effective_client_id = get_client_id().await;
    let effective_tenant_id = get_tenant_id().await;

    Ok(AzureConfig {
        client_id: config.client_id,
        tenant_id: config.tenant_id,
        effective_client_id,
        effective_tenant_id,
        default_client_id: VAULTRAIDER_CLIENT_ID.to_string(),
        default_tenant_id: MULTI_TENANT_ENDPOINT.to_string(),
    })
}

/// Save the Azure configuration
/// Pass empty strings to clear custom values and use defaults
#[tauri::command]
pub async fn save_azure_config(client_id: String, tenant_id: String) -> Result<(), String> {
    // Convert empty strings to None (meaning use defaults)
    let client_id_opt = if client_id.trim().is_empty() {
        None
    } else {
        Some(client_id.trim().to_string())
    };

    let tenant_id_opt = if tenant_id.trim().is_empty() {
        None
    } else {
        Some(tenant_id.trim().to_string())
    };

    let new_config = UserConfig {
        client_id: client_id_opt,
        tenant_id: tenant_id_opt,
    };
    update_config(new_config).await
}
