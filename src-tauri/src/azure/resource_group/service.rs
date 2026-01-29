//! Resource Group service - business logic for Azure Resource Group operations

use tracing::{debug, error, info, instrument, Span};

use crate::azure::auth::token::get_token_from_state;
use crate::azure::http::{fetch_all_paginated, AzureHttpClient};
use crate::config::urls;

use super::types::ResourceGroup;

/// Fetch all Resource Groups for a specific subscription.
///
/// # Arguments
///
/// * `subscription_id` - The Azure subscription ID
///
/// # Returns
///
/// A vector of ResourceGroup objects or an error.
#[instrument(
    name = "resource_group.list",
    skip(subscription_id),
    fields(
        subscription_id = %subscription_id,
        resource_group_count = tracing::field::Empty,
        otel.kind = "client",
    )
)]
pub async fn get_resource_groups(subscription_id: &str) -> Result<Vec<ResourceGroup>, String> {
    info!("Fetching resource groups");

    let token = get_token_from_state().await.map_err(|e| {
        error!(error = %e, "Failed to get token from state");
        e
    })?;

    debug!("Successfully retrieved authentication token");

    let client = AzureHttpClient::with_token(&token).map_err(|e| {
        error!(error = %e, "Failed to create HTTP client");
        e.to_string()
    })?;

    let url = urls::resource_groups(subscription_id);
    debug!(url = %url, "Calling Azure API");

    let rg_list = fetch_all_paginated::<ResourceGroup>(&url, &client)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch resource groups");
            e.to_string()
        })?;

    Span::current().record("resource_group_count", rg_list.len());
    info!(count = rg_list.len(), "Successfully retrieved resource groups");
    Ok(rg_list)
}

/// Fetch a specific Resource Group by name.
///
/// # Arguments
///
/// * `subscription_id` - The Azure subscription ID
/// * `resource_group_name` - The name of the resource group
///
/// # Returns
///
/// The ResourceGroup object or an error.
#[instrument(
    name = "resource_group.get",
    skip(subscription_id, resource_group_name),
    fields(
        subscription_id = %subscription_id,
        resource_group.name = %resource_group_name,
        otel.kind = "client",
    )
)]
pub async fn get_resource_group_by_name(
    subscription_id: &str,
    resource_group_name: &str,
) -> Result<ResourceGroup, String> {
    let url = urls::resource_group(subscription_id, resource_group_name);

    let token = get_token_from_state().await.map_err(|e| {
        error!(error = %e, "Failed to get token from state");
        e
    })?;

    debug!("Successfully retrieved authentication token");

    let client = AzureHttpClient::with_token(&token).map_err(|e| {
        error!(error = %e, "Failed to create HTTP client");
        e.to_string()
    })?;

    let rg_response: ResourceGroup = client.get(&url).await.map_err(|e| {
        error!(error = %e, "Failed to fetch resource group");
        e.to_string()
    })?;

    info!("Resource group fetched successfully");
    Ok(rg_response)
}
