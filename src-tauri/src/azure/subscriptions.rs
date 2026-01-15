use crate::azure::auth::constants::{ARM_SCOPE};
use crate::azure::auth::state::AUTH_CREDENTIAL;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};

use std::sync::Arc;
use tokio::sync::Mutex;
use azure_core::credentials::TokenCredential;

lazy_static::lazy_static! {
    /// Stores the authenticated credential for making Azure API calls
    pub static ref SUBSCRIPTIONS_RESPONSE: Arc<Mutex<Option<SubscriptionListResponse>>> =
        Arc::new(Mutex::new(None));
}

/// Azure Subscription information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
  pub id: String,
  #[serde(rename = "authorizationSource")]
  pub authorization_source: String,
  #[serde(rename = "managedByTenants")]
  pub managed_by_tenants: Vec<String>,
  #[serde(rename = "subscriptionId")]
  pub subscription_id: String,
  #[serde(rename = "tenantId")]
  pub tenant_id: String,
  #[serde(rename = "displayName")]
  pub display_name: String,
  pub state: String,
  #[serde(rename = "subscriptionPolicies")]
  pub subscription_policies: SubscriptionPolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionListResponse {
  pub value: Vec<Subscription>,
  pub count: SubscriptionCount
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionCount {
  pub r#type: String,
  pub value: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionPolicy {
  #[serde(rename = "locationPlacementId")]
  pub location_placement_id: String,
  #[serde(rename = "quotaId")]
  pub quota_id: String,
  #[serde(rename = "spendingLimit")]
  pub spending_limit: String,
}

use log::{info, error};

pub async fn refresh_subscriptions() -> Result<Vec<Subscription>, String> {
  let mut subscription_response = SUBSCRIPTIONS_RESPONSE.lock().await;
  *subscription_response = None;
  get_subscriptions().await
}

/// Fetch all subscriptions for the authenticated user
pub async fn get_subscriptions() -> Result<Vec<Subscription>, String> {
  info!("Fetching subscriptions...");
  //
  // let subscription_response = SUBSCRIPTIONS_RESPONSE.lock().await;
  // if subscription_response.is_some() {
  //   info!("Subscriptions already fetched, returning cached value...");
  //   return Ok(subscription_response.clone().unwrap().value);
  // }

  let credential = {
    let cred_lock = AUTH_CREDENTIAL.lock().await;
    info!("Checking AUTH_CREDENTIAL state... Is Some: {}", cred_lock.is_some());
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
    HeaderValue::from_str(&format!("Bearer {}", token_response.token.secret()))
      .map_err(|e| {
        error!("Invalid header value for Authorization: {}", e);
        format!("Invalid header value: {}", e)
      })?,
  );

  let response = client
    .get("https://management.azure.com/subscriptions?api-version=2020-01-01")
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
    error!("ARM API request failed with status {}: {}", status, error_text);
    return Err(format!("API request failed: {}", error_text));
  }

  let status = response.status();
  let body = response
    .text()
    .await
    .map_err(|e| {
      error!("Failed to read ARM response body: {}", e);
      format!("Failed to read response body: {}", e)
    })?;
  
  let mut deserializer = serde_json::Deserializer::from_str(&body);

  let sub_list: SubscriptionListResponse =
    serde_path_to_error::deserialize(&mut deserializer)
      .map_err(|e| {
        error!("Failed to parse ARM subscriptions JSON at {}: {}",
        e.path(),
        e
      );
        format!("JSON parse error at {}: {}", e.path(), e)
      })?;

  let mut subscription_response = SUBSCRIPTIONS_RESPONSE.lock().await;
  *subscription_response = Some(sub_list.clone());

  info!("Successfully fetched {} subscriptions", sub_list.value.len());
  Ok(sub_list.value)
}
