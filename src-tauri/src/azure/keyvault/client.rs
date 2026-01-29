use log::{debug, error, info, warn};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use crate::azure::auth::token::{get_token_from_state, get_token_for_scope};
use crate::azure::auth::types::AzureListResponse;
use crate::azure::keyvault::constants::{get_keyvault_uri, MANAGEMENT_TOKEN_SCOPE, KEYVAULT_TOKEN_SCOPE, create_keyvault_uri};
use crate::azure::keyvault::secret::constants::get_secrets_uri;
use crate::azure::keyvault::types::{CreateVaultRequest, KeyVault, KeyVaultAccessCheck, KeyVaultListResponse, NetworkRuleSet, Properties};

// https://learn.microsoft.com/en-us/rest/api/keyvault/secrets/get-secrets/get-secrets?view=rest-keyvault-secrets-2025-07-01&tabs=HTTP

/// Fetch all Key Subscriptions for a specific subscription
pub async fn get_keyvaults(subscription_id: &str) -> Result<Vec<KeyVault>, String> {
  info!("Fetching keyvaults for subscription: {}", subscription_id);

  let client = reqwest::Client::new();
  let mut headers = HeaderMap::new();

  let token = get_token_from_state().await.map_err(|e| {
    error!("Failed to get token from state: {}", e);
    e
  })?;

  debug!("Successfully retrieved authentication token");

  headers.insert(
    AUTHORIZATION,
    HeaderValue::from_str(&format!("Bearer {}", token))
      .map_err(|e| {
        error!("Invalid header value: {}", e);
        format!("Invalid header value: {}", e)
      })?,
  );

  let url = get_keyvault_uri(subscription_id);
  info!("Calling Azure API: {}", url);

  let kv_list = fetch_keyvaults(subscription_id, url, client, headers).await?;

  info!("Successfully retrieved {} keyvault(s)", kv_list.len());
  Ok(kv_list)
}

/// Fetch all Key Subscriptions for a specific subscription recursively using nextLink property
async fn fetch_keyvaults(subscription_id: &str, url: String, client: reqwest::Client, headers: HeaderMap) -> Result<Vec<KeyVault>, String> {
  debug!("Fetching keyvaults from: {}", url);

  let response = client
    .get(&url)
    .headers(headers.clone())
    .send()
    .await
    .map_err(|e| {
      error!("Failed to send request to {}: {}", url, e);
      format!("Failed to send request: {}", e)
    })?;

  let status = response.status();
  debug!("Response status: {}", status);

  if !status.is_success() {
    let error_text = response
      .text()
      .await
      .unwrap_or_else(|_| "Unknown error".to_string());
    error!("API request failed with status {}: {}", status, error_text);
    return Err(format!("API request failed with status {}: {}", status, error_text));
  }

  let response_text = response
    .text()
    .await
    .map_err(|e| {
      error!("Failed to read response body: {}", e);
      format!("Failed to read response body: {}", e)
    })?;

  debug!("Response body length: {} bytes", response_text.len());

  let kv_list: KeyVaultListResponse = serde_json::from_str(&response_text)
    .map_err(|e| {
      error!("Failed to parse response: {}", e);
      error!("Response body: {}", response_text);
      format!("Failed to parse response: {}", e)
    })?;

  let current_count = kv_list.value.len();
  debug!("Parsed {} keyvault(s) from current page", current_count);

  if kv_list.next_link.is_none() {
    info!("No pagination link found. Returning {} keyvault(s)", current_count);
    Ok(kv_list.value)
  } else {
    let next_url = kv_list.next_link.unwrap();
    info!("Pagination detected. Current batch: {} items. Following next link...", current_count);
    debug!("Next URL: {}", next_url);

    let mut results = vec![];
    results.extend(kv_list.value);

    let more_results = Box::pin(fetch_keyvaults(subscription_id, next_url, client, headers)).await?;

    results.extend(more_results);
    info!("Total keyvaults collected: {}", results.len());
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


// Failed to create keyvault test-jv-1 in resource group rg-test-joren: API request failed:
// {"error":{"code":"BadRequest","message":"The vault properties are missing."}}

#[tauri::command]
pub async fn create_keyvault(subscription_id: &str, resource_group: &str, keyvault_name: &str) -> Result<KeyVault, String> {
  let url = create_keyvault_uri(subscription_id, resource_group, keyvault_name);

  // Get token for Key Vault data plane, not management API
  let token = get_token_for_scope(MANAGEMENT_TOKEN_SCOPE).await?;

  let client = reqwest::Client::new();
  let mut headers = HeaderMap::new();
  headers.insert(
    AUTHORIZATION,
    HeaderValue::from_str(&format!("Bearer {}", token))
      .map_err(|e| format!("Invalid header value: {}", e))?,
  );

  headers.insert(
    CONTENT_TYPE,
    HeaderValue::from_static("application/json"),
  );

  let resource_group = crate::azure::resource_group::client::get_resource_group_by_name(subscription_id, resource_group).await?;

  // subscriptions.tsx:137  Failed to create key vault: 
  // API request failed: 
  // {"error":{"code":"BadRequest",
  // "message":"Bad JSON content found in the request. Error converting value \"\" to type 'System.Guid'. Path 'properties.tenantId', line 1, position 462."}}
  let body = CreateVaultRequest {
    location: resource_group.location,
    properties: Properties {
      access_policies: vec![],
      create_mode: None,
      enable_purge_protection: None,
      enable_rbac_authorization: false,
      enable_soft_delete: false,
      enabled_for_deployment: false,
      enabled_for_disk_encryption: None,
      enabled_for_template_deployment: None,
      hsm_pool_resource_id: None,
      network_acls: None,
      private_endpoint_connections: None,
      provisioning_state: "".to_string(),
      public_network_access: "".to_string(),
      sku: Default::default(),
      soft_delete_retention_in_days: None,
      tenant_id: "".to_string(),
      vault_uri: "".to_string(),
    }
    // properties: Default::default(), // TODO@JOREN: don't use default
  };

  let jsonBody = serde_json::to_string(&body).unwrap_or_else(|_| "".to_string());

  info!("body: {}...", jsonBody.clone());

  let response = client
    .put(url)
    .headers(headers.clone())
    .body(jsonBody)
    .send()
    .await
    .map_err(|e| format!("Failed to send request: {}", e))?;

  info!("Create vault request sent...");


  if !response.status().is_success() {
    let error_text = response
      .text()
      .await
      .unwrap_or_else(|_| "Unknown error".to_string());
    return Err(format!("API request failed: {}", error_text));
  }

  info!("Keyvault added {}...", keyvault_name);

  let created_vault: crate::azure::keyvault::types::KeyVault = response
    .json()
    .await
    .map_err(|e| format!("Failed to parse response: {}", e))?;

  Ok(created_vault)
  // Err("Not implemented".to_string())

}
