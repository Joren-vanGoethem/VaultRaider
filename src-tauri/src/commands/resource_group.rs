//! Resource Group related Tauri commands

use crate::azure::resource_group::service::get_resource_groups;
use crate::azure::resource_group::types::ResourceGroup;

/// Fetch all resource groups for a subscription
#[tauri::command]
pub async fn cmd_get_resource_groups(subscription_id: String) -> Result<Vec<ResourceGroup>, String> {
    get_resource_groups(&subscription_id).await
}
