use log::info;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use crate::azure::auth::state::AUTH_CREDENTIAL;
use crate::azure::auth::token::get_token_from_state;
use crate::azure::keyvault::constants::{get_keyvault_uri, get_secrets_uri, TOKEN_URI};
use crate::azure::keyvault::types::{KeyVault, KeyVaultListResponse};

/// Fetch all Key Vaults for a specific subscription
pub async fn get_keyvaults(subscription_id: &str) -> Result<Vec<KeyVault>, String> {
  info!("Fetching keyvaults...");

  let client = reqwest::Client::new();
  let mut headers = HeaderMap::new();
  headers.insert(
    AUTHORIZATION,
    HeaderValue::from_str(&format!("Bearer {}", get_token_from_state().await?))
      .map_err(|e| format!("Invalid header value: {}", e))?,
  );

  let url = get_keyvault_uri(subscription_id);
  let kv_list = fetch_keyvaults(subscription_id, url, client, headers).await?;

  Ok(kv_list)
}

/// Fetch all Key Vaults for a specific subscription recursively using nextLink property
async fn fetch_keyvaults(subscription_id: &str, url: String, client: reqwest::Client, headers: HeaderMap) -> Result<Vec<KeyVault>, String> {
  let response = client
    .get(&url)
    .headers(headers.clone())
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
  
  if (kv_list.next_link.is_none()) {
    Ok(kv_list.value)
  } else {
    let next_url = kv_list.next_link.unwrap();
    let mut results = vec![];
    results.extend(kv_list.value);

    let more_results = Box::pin(fetch_keyvaults(subscription_id, next_url, client, headers)).await?;
    results.extend(more_results);
    Ok(results)
  }
}

#[tauri::command]
pub async fn get_secrets(keyvault_uri: &str) -> Result<Vec<String>, String> {
  info!("Fetching secrets...");

  let url = get_secrets_uri(keyvault_uri);

  let client = reqwest::Client::new();
  let mut headers = HeaderMap::new();
  headers.insert(
    AUTHORIZATION,
    HeaderValue::from_str(&format!("Bearer {}", get_token_from_state().await?))
      .map_err(|e| format!("Invalid header value: {}", e))?,
  );

  let response = client
    .get(&url)
    .headers(headers.clone())
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

  let body = response.text().await.map_err(|e| format!("Failed to read response body: {}", e))?;
  info!("Secrets response: {}", body);
  //
  // let secrets_list: SecretsResponse = response
  //   .json()
  //   .await
  //   .map_err(|e| format!("Failed to parse response: {}", e))?;

  Err("Not implemented yet".to_string())
}
