use log::{debug, error, info};

use crate::azure::auth::token::get_token_from_state;
use crate::azure::http::{fetch_all_paginated, AzureHttpClient};
use crate::azure::resource_group::types::ResourceGroup;

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

    let rg_list = fetch_all_paginated::<ResourceGroup>(&url, &client)
        .await
        .map_err(|e| {
            error!("Failed to fetch resource groups: {}", e);
            e.to_string()
        })?;

    info!("Successfully retrieved {} resource group(s)", rg_list.len());
    Ok(rg_list)
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