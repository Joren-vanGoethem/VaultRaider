//! Activity Log related Tauri commands

use crate::azure::activity_log::service::get_activity_logs;
use crate::azure::activity_log::types::ActivityLogEvent;

/// Fetch activity log (audit) events for a specific Key Vault
#[tauri::command]
pub async fn fetch_activity_logs(
    vault_id: String,
    days: Option<u32>,
) -> Result<Vec<ActivityLogEvent>, String> {
    get_activity_logs(&vault_id, days).await
}
