use log::{debug, error, info};

use crate::azure::auth::token::get_token_from_state;
use crate::azure::http::AzureHttpClient;
use crate::azure::resource_group::types::{ResourceGroup, ResourceGroupListResponse};

/// Fetch all Resource Groups for a specific subscription
#[tauri::command]
pub async fn get_resource_groups(subscription_id: &str) -> Result<Vec<ResourceGroup>, String> {
    info!(
        "Fetching resource groups for subscription: {}",
        subscription_id
    );

    let token = get_token_from_state().await.map_err(|e| {
        error!("Failed to get token from state: {}", e);
        e
    })?;

    debug!("Successfully retrieved authentication token");

    let client = AzureHttpClient::with_token(&token).map_err(|e| {
        error!("Failed to create HTTP client: {}", e);
        e.to_string()
    })?;

    let url = crate::azure::resource_group::constants::get_resource_groups(subscription_id);
    info!("Calling Azure API: {}", url);

    let rg_list = fetch_resource_groups(&url, &client).await?;

    info!("Successfully retrieved {} resource group(s)", rg_list.len());
    Ok(rg_list)
}

/// Fetch all resource groups for a specific subscription recursively using nextLink property
async fn fetch_resource_groups(
    url: &str,
    client: &AzureHttpClient,
) -> Result<Vec<ResourceGroup>, String> {
    debug!("Fetching resource groups from: {}", url);

    let rg_response: ResourceGroupListResponse = client.get(url).await.map_err(|e| {
        error!("Failed to fetch resource groups: {}", e);
        e.to_string()
    })?;

    let current_count = rg_response.value.len();
    debug!("Parsed {} resource group(s) from current page", current_count);

    if rg_response.next_link.is_none() {
        info!(
            "No pagination link found. Returning {} resource group(s)",
            current_count
        );
        Ok(rg_response.value)
    } else {
        let next_url = rg_response.next_link.unwrap();
        info!(
            "Pagination detected. Current batch: {} items. Following next link...",
            current_count
        );
        debug!("Next URL: {}", next_url);

        let mut results = vec![];
        results.extend(rg_response.value);

        let more_results = Box::pin(fetch_resource_groups(&next_url, client)).await?;

        results.extend(more_results);
        info!("Total resource groups collected: {}", results.len());
        Ok(results)
    }
}

pub async fn get_resource_group_by_name(
    subscription_id: &str,
    resource_group_name: &str,
) -> Result<ResourceGroup, String> {
    let url = crate::azure::resource_group::constants::get_resource_group_by_name(
        subscription_id,
        resource_group_name,
    );

    let token = get_token_from_state().await.map_err(|e| {
        error!("Failed to get token from state: {}", e);
        e
    })?;

    debug!("Successfully retrieved authentication token");

    let client = AzureHttpClient::with_token(&token).map_err(|e| {
        error!("Failed to create HTTP client: {}", e);
        e.to_string()
    })?;

    let rg_response: ResourceGroup = client.get(&url).await.map_err(|e| {
        error!("Failed to fetch resource group: {}", e);
        e.to_string()
    })?;

    Ok(rg_response)
}