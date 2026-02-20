//! Generic pagination utilities for Azure API responses
//!
//! This module provides a reusable function for handling Azure's
//! paginated API responses that use the `nextLink` pattern.

use log::{debug, info};
use serde::de::DeserializeOwned;

use crate::azure::auth::types::AzureListResponse;
use crate::azure::http::client::AzureHttpClient;
use crate::azure::http::error::AzureHttpError;

/// Fetches all items from a paginated Azure API endpoint.
///
/// Azure APIs typically return paginated responses with a `value` array
/// and an optional `nextLink` field pointing to the next page of results.
/// This function handles that pagination automatically, collecting all
/// items across all pages into a single vector.
///
/// # Type Parameters
///
/// * `T` - The type of items in the response. Must implement `DeserializeOwned`.
///
/// # Arguments
///
/// * `initial_url` - The URL of the first page to fetch
/// * `client` - An authenticated `AzureHttpClient` instance
///
/// # Returns
///
/// Returns `Ok(Vec<T>)` containing all items from all pages, or an
/// `AzureHttpError` if any request fails.
///
/// # Example
///
/// ```rust,ignore
/// use crate::azure::http::{AzureHttpClient, pagination::fetch_all_paginated};
/// use crate::azure::keyvault::types::KeyVault;
///
/// let client = AzureHttpClient::with_token(&token)?;
/// let url = "https://management.azure.com/subscriptions/.../vaults?api-version=2023-07-01";
///
/// let all_vaults: Vec<KeyVault> = fetch_all_paginated(url, &client).await?;
/// ```
pub async fn fetch_all_paginated<T>(
    initial_url: &str,
    client: &AzureHttpClient,
) -> Result<Vec<T>, AzureHttpError>
where
    T: DeserializeOwned,
{
    let mut results = Vec::new();
    let mut current_url = Some(initial_url.to_string());
    let mut page_count = 0;

    while let Some(url) = current_url {
        page_count += 1;
        debug!("Fetching page {} {}", page_count, url);

        let response: AzureListResponse<T> = client.get(&url).await?;
        let items_count = response.value.len();

        debug!("Page {} fetched: {} items", page_count, items_count);
        results.extend(response.value);

        current_url = response.next_link;

        if current_url.is_some() {
            debug!("Next page link found, continuing pagination");
        }
    }

    info!(
        "Pagination complete, {} items fetched across {} pages",
        results.len(),
        page_count
    );

    Ok(results)
}

#[cfg(test)]
mod tests {
    // Note: Integration tests would require mocking the HTTP client
    // The functions are tested through the actual API calls in the application

    #[test]
    fn test_module_compiles() {
        // This test verifies the module compiles correctly
        // Actual pagination logic is tested via integration tests
        assert!(true);
    }
}
