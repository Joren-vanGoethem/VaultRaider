//! Subscription-related Tauri commands

use crate::azure::subscription::service::get_subscriptions;
use crate::azure::subscription::types::Subscription;

/// Fetch all Azure subscriptions for the authenticated user
#[tauri::command]
pub async fn fetch_subscriptions() -> Result<Vec<Subscription>, String> {
    get_subscriptions().await
}
