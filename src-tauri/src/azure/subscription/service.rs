//! Subscription service - business logic for Azure subscriptions

use tracing::{error, info, instrument, Span};

use crate::azure::auth::token::get_token_from_state;
use crate::azure::http::AzureHttpClient;
use crate::config::urls;

use super::types::{Subscription, SubscriptionListResponse};

/// Fetch all subscriptions for the authenticated user
#[instrument(
    name = "subscription.list",
    fields(
        subscription_count = tracing::field::Empty,
        otel.kind = "client",
    )
)]
pub async fn get_subscriptions() -> Result<Vec<Subscription>, String> {
    info!("Fetching subscriptions");

    let token = get_token_from_state().await?;
    let client = AzureHttpClient::new()
        .with_bearer_token(&token)
        .map_err(|e| e.to_string())?;

    let url = urls::subscriptions();

    let sub_list: SubscriptionListResponse = client.get(&url).await.map_err(|e| {
        error!(error = %e, "Failed to fetch subscriptions");
        e.to_string()
    })?;

    Span::current().record("subscription_count", sub_list.value.len());
    info!(count = sub_list.value.len(), "Successfully fetched subscriptions");
    Ok(sub_list.value)
}
