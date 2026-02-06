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
pub async fn get_subscriptions() -> Result<Vec<Subscription>, String> {
    get_subscriptions_internal().await.map_err(|e| {
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
    info!(
        "Successfully fetched {} subscriptions",
        sub_list.value.len()
    );
    Ok(sub_list.value)
}

pub async fn get_subscription(subscription_id: &str) -> Result<Subscription> {
    let subscriptions = get_subscriptions_internal().await?;

    subscriptions
        .into_iter()
        .find(|sub| sub.subscription_id.eq_ignore_ascii_case(subscription_id))
        .ok_or_else(|| {
            anyhow::anyhow!(format!(
                "Subscription with ID '{}' not found",
                subscription_id
            ))
        })
}

pub async fn get_subscription_internal(subscription_id: &str) -> Result<Subscription> {
    let url = urls::subscription(subscription_id);

    let token = get_token_from_state()
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve authentication token")?;

    let client = AzureHttpClient::new()
        .with_bearer_token(&token)
        .context("Failed to create HTTP client with token")?;

    client
        .get(&url)
        .await
        .context("Failed to fetch subscription from Azure")
}
