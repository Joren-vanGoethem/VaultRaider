use log::{error, info};
use serde::{Deserialize, Serialize};

use crate::azure::auth::token::get_token_from_state;
use crate::azure::http::AzureHttpClient;

/// Azure Subscription information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub id: String,
    pub authorization_source: String,
    pub managed_by_tenants: Vec<Tenant>,
    pub subscription_id: String,
    pub tenant_id: String,
    pub display_name: String,
    pub state: String,
    pub subscription_policies: SubscriptionPolicy,
    pub tags: Option<serde_json::Value>
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tenant {
    pub tenant_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionListResponse {
    pub value: Vec<Subscription>,
    pub next_link: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionPolicy {
    pub location_placement_id: String,
    pub quota_id: String,
    pub spending_limit: String,
}

/// Fetch all subscriptions for the authenticated user
pub async fn get_subscriptions() -> Result<Vec<Subscription>, String> {
    info!("Fetching subscriptions...");

    let token = get_token_from_state().await?;
    let client = AzureHttpClient::new()
        .with_bearer_token(&token)
        .map_err(|e| e.to_string())?;

    let url = "https://management.azure.com/subscriptions?api-version=2022-12-01";

    let sub_list: SubscriptionListResponse = client.get(url).await.map_err(|e| {
        error!("Failed to fetch subscriptions: {}", e);
        e.to_string()
    })?;

    info!(
        "Successfully fetched {} subscriptions",
        sub_list.value.len()
    );
    Ok(sub_list.value)
}
