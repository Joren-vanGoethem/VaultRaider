//! Cache-related Tauri commands
//!
//! Provides commands for cache management and statistics.

use crate::cache::{CacheStatistics, AZURE_CACHE};

/// Get cache statistics
#[tauri::command]
pub fn get_cache_stats() -> CacheStatistics {
    AZURE_CACHE.get_stats()
}

/// Clear all caches
#[tauri::command]
pub async fn clear_cache() -> Result<String, String> {
    AZURE_CACHE.clear_all().await;
    Ok("Cache cleared successfully".to_string())
}

/// Invalidate subscriptions cache (force refresh on next fetch)
#[tauri::command]
pub async fn invalidate_subscriptions_cache() -> Result<String, String> {
    AZURE_CACHE.invalidate_subscriptions().await;
    Ok("Subscriptions cache invalidated".to_string())
}

/// Invalidate keyvaults cache for a subscription
#[tauri::command]
pub async fn invalidate_keyvaults_cache(subscription_id: String) -> Result<String, String> {
    AZURE_CACHE.invalidate_keyvaults(&subscription_id).await;
    Ok(format!(
        "Keyvaults cache invalidated for subscription {}",
        subscription_id
    ))
}

/// Invalidate resource groups cache for a subscription
#[tauri::command]
pub async fn invalidate_resource_groups_cache(subscription_id: String) -> Result<String, String> {
    AZURE_CACHE
        .invalidate_resource_groups(&subscription_id)
        .await;
    Ok(format!(
        "Resource groups cache invalidated for subscription {}",
        subscription_id
    ))
}

/// Invalidate secrets cache for a vault
#[tauri::command]
pub async fn invalidate_vault_cache(vault_uri: String) -> Result<String, String> {
    AZURE_CACHE.invalidate_vault_secrets(&vault_uri).await;
    Ok(format!("Secrets cache invalidated for vault {}", vault_uri))
}
