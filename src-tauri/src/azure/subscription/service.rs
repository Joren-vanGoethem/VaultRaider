//! Subscription service - business logic for Azure subscriptions

use anyhow::{Context, Result};
use log::{error, info};

use crate::azure::auth::token::get_token_from_state;
use crate::azure::http::AzureHttpClient;
use crate::config::urls;

use super::types::{Subscription, SubscriptionListResponse};

/// Fetch all subscriptions for the authenticated user.
///
/// # Returns
///
/// A vector of Subscription objects or an error.
///
/// # Errors
///
/// This function will return an error if:
/// - The user is not authenticated
/// - The API request fails
// #[instrument(
//     name = "subscription.list",
//     fields(
//         subscription_count = tracing::field::Empty,
//         otel.kind = "client",
//     )
// )]
pub async fn get_subscriptions() -> Result<Vec<Subscription>, String> {
    get_subscriptions_internal()
        .await
        .map_err(|e| {
            error!("Failed to fetch subscriptions: {}", e);
            e.to_string()
        })
}

async fn get_subscriptions_internal() -> Result<Vec<Subscription>> {
    info!("Fetching subscriptions");

    let token = get_token_from_state()
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve authentication token")?;

    let client = AzureHttpClient::new()
        .with_bearer_token(&token)
        .context("Failed to create HTTP client with token")?;

    let url = urls::subscriptions();

    let sub_list: SubscriptionListResponse = client
        .get(&url)
        .await
        .context("Failed to fetch subscriptions from Azure")?;

    // Span::current().record("subscription_count", sub_list.value.len());
    info!("Successfully fetched {} subscriptions", sub_list.value.len());
    Ok(sub_list.value)
}
