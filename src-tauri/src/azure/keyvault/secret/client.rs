use log::info;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use crate::azure::auth::token::get_token_for_scope;
use crate::azure::keyvault::constants::KEYVAULT_TOKEN_SCOPE;
use crate::azure::keyvault::secret::constants::{create_secret_uri, delete_secret_uri, get_secret_version_uri, get_secrets_uri};
use crate::azure::keyvault::secret::types::{DeletedSecretBundle, Secret, SecretBundle, SecretListResponse};

#[tauri::command]
pub async fn get_secrets(keyvault_uri: &str) -> Result<Vec<Secret>, String> {
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

  let secret_list = fetch_secrets(url, client, headers).await?;

  Ok(secret_list)
}

async fn fetch_secrets(url: String, client: reqwest::Client, headers: HeaderMap) -> Result<Vec<Secret>, String> {
  let response = client
    .get(url)
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

  let secrets_list: SecretListResponse = response
    .json()
    .await
    .map_err(|e| format!("Failed to parse response: {}", e))?;

  if (secrets_list.next_link.is_none()) {
    Ok(secrets_list.value)
  } else {
    let next_url = secrets_list.next_link.unwrap();
    let mut results = vec![];
    results.extend(secrets_list.value);

    let more_results = Box::pin(fetch_secrets(next_url, client, headers)).await?;
    results.extend(more_results);
    Ok(results)
  }
}

#[tauri::command]
pub async fn get_secret(keyvault_uri: &str, secret_name: &str, secret_version: Option<&str>) -> Result<SecretBundle, String> {
  info!("Fetching secret {}...", secret_name);

  let url = get_secret_version_uri(keyvault_uri, secret_name, secret_version);

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
    .get(url)
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

  let secret: SecretBundle = response
    .json()
    .await
    .map_err(|e| format!("Failed to parse response: {}", e))?;

  Ok(secret)
}

#[tauri::command]
pub async fn delete_secret(keyvault_uri: &str, secret_name: &str) -> Result<DeletedSecretBundle, String> {
  info!("Deleting secret {}...", secret_name);

  let url = delete_secret_uri(keyvault_uri, secret_name);

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
    .delete(url)
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

  let deleted_secret: DeletedSecretBundle = response
    .json()
    .await
    .map_err(|e| format!("Failed to parse response: {}", e))?;

  Ok(deleted_secret)
}


#[tauri::command]
pub async fn create_secret(keyvault_uri: &str, secret_name: &str, secret_value: &str) -> Result<SecretBundle, String> {
  info!("Adding secret {}...", secret_name);

  let url = create_secret_uri(keyvault_uri, secret_name);

  // Get token for Key Vault data plane, not management API
  let token = get_token_for_scope(KEYVAULT_TOKEN_SCOPE).await?;

  let client = reqwest::Client::new();
  let mut headers = HeaderMap::new();
  headers.insert(
    AUTHORIZATION,
    HeaderValue::from_str(&format!("Bearer {}", token))
      .map_err(|e| format!("Invalid header value: {}", e))?,
  );

  let body = format!("{{\"value\": \"{}\"}}", secret_value);

  let response = client
    .put(url)
    .headers(headers.clone())
    .body(body)
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

  let created_secret: SecretBundle = response
    .json()
    .await
    .map_err(|e| format!("Failed to parse response: {}", e))?;

  Ok(created_secret)
}
