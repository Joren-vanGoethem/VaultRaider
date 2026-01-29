use crate::azure::auth::token::get_token_from_state;
use crate::azure::resource_group::types::{ResourceGroup, ResourceGroupListResponse};
use log::info;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};

/// Fetch all Resource Groups for a specific subscription
#[tauri::command]
pub async fn get_resource_groups(subscription_id: &str) -> Result<Vec<ResourceGroup>, String> {
    info!("Fetching resource groups...");

    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", get_token_from_state().await?))
            .map_err(|e| format!("Invalid header value: {}", e))?,
    );

    let url = crate::azure::resource_group::constants::get_resource_groups(subscription_id);
    let rg_list = fetch_resource_groups(subscription_id, url, client, headers).await?;

    Ok(rg_list)
}

/// Fetch all resource groups for a specific subscription recursively using nextLink property
async fn fetch_resource_groups(
    subscription_id: &str,
    url: String,
    client: reqwest::Client,
    headers: HeaderMap,
) -> Result<Vec<ResourceGroup>, String> {
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

    let kv_list: ResourceGroupListResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if (kv_list.next_link.is_none()) {
        Ok(kv_list.value)
    } else {
        let next_url = kv_list.next_link.unwrap();
        let mut results = vec![];
        results.extend(kv_list.value);

        let more_results = Box::pin(fetch_resource_groups(
            subscription_id,
            next_url,
            client,
            headers,
        ))
        .await?;
        results.extend(more_results);
        Ok(results)
    }
}
