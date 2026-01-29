use crate::azure::auth::token::get_token_from_state;
use crate::azure::resource_group::types::{ResourceGroup, ResourceGroupListResponse};
use log::{debug, error, info, warn};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};

/// Fetch all Resource Groups for a specific subscription
#[tauri::command]
pub async fn get_resource_groups(subscription_id: &str) -> Result<Vec<ResourceGroup>, String> {
    info!("Fetching resource groups for subscription: {}", subscription_id);

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

    let url = crate::azure::resource_group::constants::get_resource_groups(subscription_id);
    info!("Calling Azure API: {}", url);

    let rg_list = fetch_resource_groups(subscription_id, url, client, headers).await?;

    info!("Successfully retrieved {} resource group(s)", rg_list.len());
    Ok(rg_list)
}

/// Fetch all resource groups for a specific subscription recursively using nextLink property
async fn fetch_resource_groups(
    subscription_id: &str,
    url: String,
    client: reqwest::Client,
    headers: HeaderMap,
) -> Result<Vec<ResourceGroup>, String> {
    debug!("Fetching resource groups from: {}", url);

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

    let rg_response: ResourceGroupListResponse = serde_json::from_str(&response_text)
        .map_err(|e| {
            error!("Failed to parse response: {}", e);
            error!("Response body: {}", response_text);
            format!("Failed to parse response: {}", e)
        })?;

    let current_count = rg_response.value.len();
    debug!("Parsed {} resource group(s) from current page", current_count);

    if rg_response.next_link.is_none() {
        info!("No pagination link found. Returning {} resource group(s)", current_count);
        Ok(rg_response.value)
    } else {
        let next_url = rg_response.next_link.unwrap();
        info!("Pagination detected. Current batch: {} items. Following next link...", current_count);
        debug!("Next URL: {}", next_url);

        let mut results = vec![];
        results.extend(rg_response.value);

        let more_results = Box::pin(fetch_resource_groups(
            subscription_id,
            next_url,
            client,
            headers,
        ))
        .await?;

        results.extend(more_results);
        info!("Total resource groups collected: {}", results.len());
        Ok(results)
    }
}

pub async fn get_resource_group_by_name(subscription_id: &str, resource_group_name: &str) -> Result<ResourceGroup, String> {
   let url = crate::azure::resource_group::constants::get_resource_group_by_name(subscription_id, resource_group_name);

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

    let rg_response: ResourceGroup = serde_json::from_str(&response_text)
      .map_err(|e| {
          error!("Failed to parse response: {}", e);
          error!("Response body: {}", response_text);
          format!("Failed to parse response: {}", e)
      })?;

    Ok(rg_response)
}