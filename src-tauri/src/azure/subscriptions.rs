use crate::azure::auth::constants::ARM_SCOPE;
use crate::azure::auth::state::AUTH_CREDENTIAL;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};

use azure_core::credentials::TokenCredential;

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

use log::{error, info};

/// Fetch all subscriptions for the authenticated user
pub async fn get_subscriptions() -> Result<Vec<Subscription>, String> {
    info!("Fetching subscriptions...");

    let credential = {
        let cred_lock = AUTH_CREDENTIAL.lock().await;
        info!(
            "Checking AUTH_CREDENTIAL state... Is Some: {}",
            cred_lock.is_some()
        );
        cred_lock.clone().ok_or_else(|| {
            error!("Not authenticated attempt to fetch subscriptions. AUTH_CREDENTIAL is None.");
            "Not authenticated. Please login first."
        })?
    };

    info!("Got credential from state, requesting token...");

    // Get a token for the Azure Management API
    // The scope for ARM is ARM_SCOPE
    let token_response = credential
        .get_token(&[ARM_SCOPE], None)
        .await
        .map_err(|e| {
            error!("Failed to get token for ARM: {}", e);
            format!("Failed to get token: {}", e)
        })?;

    info!("Token acquired, calling ARM API...");

    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", token_response.token.secret())).map_err(
            |e| {
                error!("Invalid header value for Authorization: {}", e);
                format!("Invalid header value: {}", e)
            },
        )?,
    );

    let response = client
        .get("https://management.azure.com/subscriptions?api-version=2022-12-01")
        .headers(headers)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to send ARM API request: {}", e);
            format!("Failed to send request: {}", e)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        error!(
            "ARM API request failed with status {}: {}",
            status, error_text
        );
        return Err(format!("API request failed: {}", error_text));
    }

    let body = response.text().await.map_err(|e| {
        error!("Failed to read ARM response body: {}", e);
        format!("Failed to read response body: {}", e)
    })?;

    let mut deserializer = serde_json::Deserializer::from_str(&body);

    let sub_list: SubscriptionListResponse = serde_path_to_error::deserialize(&mut deserializer)
        .map_err(|e| {
            error!(
                "Failed to parse ARM subscriptions JSON at {}: {}",
                e.path(),
                e
            );
            format!("JSON parse error at {}: {}", e.path(), e)
        })?;

    info!(
        "Successfully fetched {} subscriptions",
        sub_list.value.len()
    );
    Ok(sub_list.value)
}
