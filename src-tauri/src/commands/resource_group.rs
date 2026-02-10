//! Resource Group related Tauri commands

use crate::azure::resource_group::types::ResourceGroup;
use crate::cache::AZURE_CACHE;

/// Fetch all resource groups for a subscription
/// Uses caching with automatic loading on cache miss
#[tauri::command]
pub async fn get_resource_groups(subscription_id: String) -> Result<Vec<ResourceGroup>, String> {
    let sub_id = subscription_id.clone();
    AZURE_CACHE
        .get_resource_groups_or_load(&subscription_id, || async move {
            crate::azure::resource_group::service::get_resource_groups(&sub_id).await
        })
        .await
}
