//! Resource Group service - business logic for Azure Resource Group operations

use anyhow::{Context, Result};
use log::{debug, error, info};

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
///
/// # Errors
///
/// This function will return an error if:
/// - The user is not authenticated
/// - The API request fails
// #[instrument(
//     name = "resource_group.list",
//     skip(subscription_id),
//     fields(
//         subscription_id = %subscription_id,
//         resource_group_count = tracing::field::Empty,
//         otel.kind = "client",
//     )
// )]
pub async fn get_resource_groups(subscription_id: &str) -> Result<Vec<ResourceGroup>, String> {
    get_resource_groups_internal(subscription_id)
        .await
        .map_err(|e| {
            error!("Failed to fetch resource groups: {}", e);
            e.to_string()
        })
}

async fn get_resource_groups_internal(subscription_id: &str) -> Result<Vec<ResourceGroup>> {
    info!("Fetching resource groups");

    let token = get_token_from_state()
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve authentication token")?;

    debug!("Successfully retrieved authentication token");

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    let url = urls::resource_groups(subscription_id);
    debug!("Calling Azure API: {}", url);

    let rg_list = fetch_all_paginated::<ResourceGroup>(&url, &client)
        .await
        .with_context(|| {
            format!(
                "Failed to fetch resource groups for subscription {}",
                subscription_id
            )
        })?;

    // Span::current().record("resource_group_count", rg_list.len());
    info!("Successfully retrieved {} resource groups", rg_list.len());
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
///
/// # Errors
///
/// This function will return an error if:
/// - The user is not authenticated
/// - The resource group doesn't exist
/// - The API request fails
// #[instrument(
//     name = "resource_group.get",
//     skip(subscription_id, resource_group_name),
//     fields(
//         subscription_id = %subscription_id,
//         resource_group.name = %resource_group_name,
//         otel.kind = "client",
//     )
// )]
pub async fn get_resource_group_by_name(
    subscription_id: &str,
    resource_group_name: &str,
) -> Result<ResourceGroup, String> {
    get_resource_group_by_name_internal(subscription_id, resource_group_name)
        .await
        .map_err(|e| {
            error!("Failed to fetch resource group: {}", e);
            e.to_string()
        })
}

async fn get_resource_group_by_name_internal(
    subscription_id: &str,
    resource_group_name: &str,
) -> Result<ResourceGroup> {
    let url = urls::resource_group(subscription_id, resource_group_name);

    let token = get_token_from_state()
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve authentication token")?;

    debug!("Successfully retrieved authentication token");

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    let rg_response: ResourceGroup = client.get(&url).await.with_context(|| {
        format!(
            "Failed to fetch resource group '{}' in subscription {}",
            resource_group_name, subscription_id
        )
    })?;

    info!("Resource group fetched successfully");
    Ok(rg_response)
}
