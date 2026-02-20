//! Activity Log related Tauri commands

use crate::azure::activity_log::graph::{resolve_caller_identities, ResolvedCaller};
use crate::azure::activity_log::service::get_activity_logs;
use crate::azure::activity_log::types::ActivityLogEvent;
use std::collections::HashMap;

/// Fetch activity log (audit) events for a specific Key Vault
#[tauri::command]
pub async fn fetch_activity_logs(
    vault_id: String,
    days: Option<u32>,
) -> Result<Vec<ActivityLogEvent>, String> {
    get_activity_logs(&vault_id, days).await
}

/// Resolve caller GUIDs to display names via Microsoft Graph API
#[tauri::command]
pub async fn resolve_callers(
    caller_ids: Vec<String>,
) -> Result<HashMap<String, ResolvedCaller>, String> {
    resolve_caller_identities(caller_ids).await
}
