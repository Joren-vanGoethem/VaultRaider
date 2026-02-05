//! Subscription-related Tauri commands

use crate::azure::subscription::service::{get_subscriptions, get_subscription};
use crate::azure::subscription::types::Subscription;
use crate::cache::AZURE_CACHE;
use anyhow::{Context, Result};

/// Fetch all Azure subscriptions for the authenticated user
/// Uses caching with automatic loading on cache miss
#[tauri::command]
pub async fn fetch_subscriptions() -> Result<Vec<Subscription>, String> {
    AZURE_CACHE
        .get_subscriptions_or_load(|| async {
            get_subscriptions().await
        })
        .await
}

#[tauri::command]
pub async fn fetch_subscription(subscription_id: &str) -> Result<Subscription> {
  AZURE_CACHE
    .get_subscription_or_load(subscription_id, || async {
      get_subscription(subscription_id).await
    })
    .await
}



