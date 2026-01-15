use log::info;
use crate::azure::auth::state::AUTH_CREDENTIAL;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};

/// Azure Key Vault information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyVault {
  pub id: String,
  pub name: String,
  pub location: String,
  pub properties: KeyVaultProperties,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyVaultProperties {
  #[serde(rename = "vaultUri")]
  pub vault_uri: String,
}

#[derive(Debug, Deserialize)]
pub struct KeyVaultListResponse {
  pub value: Vec<KeyVault>,
}

/// Fetch all Key Vaults for a specific subscription
pub async fn get_keyvaults(subscription_id: &str) -> Result<Vec<KeyVault>, String> {
  info!("Fetching keyvaults...");
  let credential = {
    let cred_lock = AUTH_CREDENTIAL.lock().await;
    cred_lock.clone().ok_or("Not authenticated. Please login first.")?
  };

  // Get a token for the Azure Management API
  let token_response = credential
    .get_token(&["https://management.azure.com/.default"], None)
    .await
    .map_err(|e| format!("Failed to get token: {}", e))?;

  let client = reqwest::Client::new();
  let mut headers = HeaderMap::new();
  headers.insert(
    AUTHORIZATION,
    HeaderValue::from_str(&format!("Bearer {}", token_response.token.secret()))
      .map_err(|e| format!("Invalid header value: {}", e))?,
  );

  let url = format!(
    "https://management.azure.com/subscriptions/{}/providers/Microsoft.KeyVault/vaults?api-version=2023-07-01",
    subscription_id
  );

  let response = client
    .get(&url)
    .headers(headers)
    .send()
    .await
    .map_err(|e| format!("Failed to send request: {}", e))?;

  if !response.status().is_success() {
    let error_text = response
      .text()
      .await
      .unwrap_or_else(|_| "Unknown error".to_string());
    return Err(format!("API request failed: {}", error_text));
  }

  let kv_list: KeyVaultListResponse = response
    .json()
    .await
    .map_err(|e| format!("Failed to parse response: {}", e))?;

  Ok(kv_list.value)
}
