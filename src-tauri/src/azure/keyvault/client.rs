use log::info;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use crate::azure::auth::token::{get_token_from_state, get_token_for_scope};
use crate::azure::keyvault::constants::{get_keyvault_uri, get_secrets_uri, TOKEN_URI, KEYVAULT_TOKEN_SCOPE};
use crate::azure::keyvault::types::{KeyVault, KeyVaultListResponse, KeyVaultAccessCheck};

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

/// Check if we have access to a specific Key Vault by attempting to list secrets
#[tauri::command]
pub async fn check_keyvault_access(keyvault_uri: &str) -> Result<KeyVaultAccessCheck, String> {
  info!("Checking access to Key Vault: {}", keyvault_uri);
  info!("Requesting token with scope: {}", KEYVAULT_TOKEN_SCOPE);

  // Try to get a token for the Key Vault data plane
  let token = match get_token_for_scope(KEYVAULT_TOKEN_SCOPE).await {
    Ok(t) => {
      info!("Successfully obtained token for Key Vault access");
      t
    },
    Err(e) => {
      return Ok(KeyVaultAccessCheck {
        vault_uri: keyvault_uri.to_string(),
        has_access: false,
        can_list_secrets: false,
        error_message: Some(format!("Failed to get token: {}", e)),
      });
    }
  };

  // Construct the secrets list URL
  let url = get_secrets_uri(keyvault_uri);

  let client = reqwest::Client::new();
  let mut headers = HeaderMap::new();
  headers.insert(
    AUTHORIZATION,
    HeaderValue::from_str(&format!("Bearer {}", token))
      .map_err(|e| format!("Invalid header value: {}", e))?,
  );

  // Try to list secrets - this will tell us if we have access
  let response = match client
    .get(&url)
    .headers(headers)
    .send()
    .await
  {
    Ok(r) => r,
    Err(e) => {
      return Ok(KeyVaultAccessCheck {
        vault_uri: keyvault_uri.to_string(),
        has_access: false,
        can_list_secrets: false,
        error_message: Some(format!("Network error: {}", e)),
      });
    }
  };

  let status = response.status();

  if status.is_success() {
    info!("Successfully accessed Key Vault: {}", keyvault_uri);
    Ok(KeyVaultAccessCheck {
      vault_uri: keyvault_uri.to_string(),
      has_access: true,
      can_list_secrets: true,
      error_message: None,
    })
  } else {
    let error_text = response
      .text()
      .await
      .unwrap_or_else(|_| format!("HTTP {}", status));

    info!("Access denied to Key Vault {}: {}", keyvault_uri, error_text);

    Ok(KeyVaultAccessCheck {
      vault_uri: keyvault_uri.to_string(),
      has_access: false,
      can_list_secrets: false,
      error_message: Some(format!("HTTP {}: {}", status, error_text)),
    })
  }
}

#[tauri::command]
pub async fn get_secrets(keyvault_uri: &str) -> Result<Vec<String>, String> {
  info!("Fetching secrets...");

  let url = get_secrets_uri(keyvault_uri);

  // Get token for Key Vault data plane, not management API
  let token = get_token_for_scope(KEYVAULT_TOKEN_SCOPE).await?;

  let client = reqwest::Client::new();
  let mut headers = HeaderMap::new();
  headers.insert(
    AUTHORIZATION,
    HeaderValue::from_str(&format!("Bearer {}", token))
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
