//! Activity Log service - business logic for Azure Monitor Activity Logs

use anyhow::{Context, Result};
use log::{debug, error, info};

use crate::azure::auth::token::get_token_from_state;
use crate::azure::auth::types::AzureListResponse;
use crate::azure::http::AzureHttpClient;
use crate::config::urls;

use super::types::ActivityLogEvent;

/// Fetch activity log events for a specific Key Vault resource.
///
/// Uses the Azure Monitor Activity Log REST API to retrieve audit events.
///
/// # Arguments
///
/// * `vault_id` - The full Azure resource ID of the Key Vault
///   (e.g., `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{name}`)
/// * `days` - Number of days of history to fetch (1-90, default 7)
///
/// # Returns
///
/// A vector of activity log events or an error.
pub async fn get_activity_logs(
    vault_id: &str,
    days: Option<u32>,
) -> Result<Vec<ActivityLogEvent>, String> {
    get_activity_logs_internal(vault_id, days)
        .await
        .map_err(|e| {
            error!("Failed to get activity logs: {}", e);
            e.to_string()
        })
}

async fn get_activity_logs_internal(
    vault_id: &str,
    days: Option<u32>,
) -> Result<Vec<ActivityLogEvent>> {
    let days = days.unwrap_or(7).min(90).max(1);
    info!("Fetching activity logs for vault, last {} days", days);

    let token = get_token_from_state()
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve authentication token")?;

    debug!("Successfully retrieved authentication token for activity logs");

    let client = AzureHttpClient::new()
        .with_bearer_token(&token)
        .context("Failed to create HTTP client with token")?;

    let url = urls::activity_logs(vault_id, days);
    debug!("Calling Azure Monitor API: {}", url);

    // The Activity Log API uses the same pagination pattern
    let mut results = Vec::new();
    let mut current_url = Some(url);

    while let Some(url) = current_url {
        debug!("Fetching activity log page: {}", url);

        let response: AzureListResponse<ActivityLogEvent> = client
            .get(&url)
            .await
            .with_context(|| format!("Failed to fetch activity logs for {}", vault_id))?;

        let items_count = response.value.len();
        debug!("Activity log page fetched: {} events", items_count);
        results.extend(response.value);

        current_url = response.next_link;
    }

    info!(
        "Successfully retrieved {} activity log events",
        results.len()
    );

    Ok(results)
}
