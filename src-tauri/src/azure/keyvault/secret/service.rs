//! Secret service - business logic for Key Vault secret operations

use anyhow::{Context, Result};
use log::{error, info};
use serde::Serialize;

use crate::azure::auth::token::get_token_for_scope;
use crate::azure::http::{fetch_all_paginated, AzureHttpClient, AzureHttpError};
use crate::config::{urls, KEYVAULT_SCOPE};

use super::types::{DeletedSecretBundle, DeletedSecretItem, Secret, SecretBundle};

/// Request body for creating/updating a secret
#[derive(Serialize)]
struct SecretValue {
    value: String,
}

/// Fetch all secrets from a Key Vault.
///
/// # Arguments
///
/// * `keyvault_uri` - The Key Vault URI (e.g., https://myvault.vault.azure.net)
///
/// # Returns
///
/// A vector of Secret metadata (not including values).
///
/// # Errors
///
/// This function will return an error if:
/// - The user is not authenticated
/// - Access to the Key Vault is denied
/// - The API request fails
pub async fn get_secrets(keyvault_uri: &str) -> Result<Vec<Secret>, String> {
    get_secrets_internal(keyvault_uri).await.map_err(|e| {
        error!("Failed to get secrets: {}", e);
        e.to_string()
    })
}

async fn get_secrets_internal(keyvault_uri: &str) -> Result<Vec<Secret>> {
    info!("Fetching secrets");

    let url = urls::secrets(keyvault_uri);
    let token = get_token_for_scope(KEYVAULT_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve Key Vault token")?;

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    let secret_list = fetch_all_paginated::<Secret>(&url, &client)
        .await
        .with_context(|| format!("Failed to fetch secrets from {}", keyvault_uri))?;

    // Span::current().record("secret_count", secret_list.len());
    info!("Successfully fetched {} secrets", secret_list.len());
    Ok(secret_list)
}

/// Fetch a specific secret with its value.
///
/// # Arguments
///
/// * `keyvault_uri` - The Key Vault URI
/// * `secret_name` - The name of the secret
/// * `secret_version` - Optional specific version (defaults to latest)
///
/// # Returns
///
/// The secret bundle including its value.
///
/// # Errors
///
/// This function will return an error if:
/// - The user is not authenticated
/// - The secret doesn't exist
/// - Access is denied
pub async fn get_secret(
    keyvault_uri: &str,
    secret_name: &str,
    secret_version: Option<&str>,
) -> Result<SecretBundle, String> {
    get_secret_internal(keyvault_uri, secret_name, secret_version)
        .await
        .map_err(|e| {
            error!("Failed to get secret: {}", e);
            e.to_string()
        })
}

async fn get_secret_internal(
    keyvault_uri: &str,
    secret_name: &str,
    secret_version: Option<&str>,
) -> Result<SecretBundle> {
    info!("Fetching secret");

    let url = urls::secret(keyvault_uri, secret_name, secret_version);
    let token = get_token_for_scope(KEYVAULT_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve Key Vault token")?;

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    let secret: SecretBundle = client.get(&url).await.with_context(|| {
        format!(
            "Failed to fetch secret '{}' from {}",
            secret_name, keyvault_uri
        )
    })?;

    info!("Secret fetched successfully");
    Ok(secret)
}

/// Fetch all versions of a specific secret.
///
/// # Arguments
///
/// * `keyvault_uri` - The Key Vault URI
/// * `secret_name` - The name of the secret
///
/// # Returns
///
/// A vector of Secret metadata for each version (not including values).
pub async fn get_secret_versions(keyvault_uri: &str, secret_name: &str) -> Result<Vec<Secret>, String> {
    get_secret_versions_internal(keyvault_uri, secret_name)
        .await
        .map_err(|e| {
            error!("Failed to get secret versions: {}", e);
            e.to_string()
        })
}

async fn get_secret_versions_internal(keyvault_uri: &str, secret_name: &str) -> Result<Vec<Secret>> {
    info!("Fetching versions for secret '{}'", secret_name);

    let url = urls::secret_versions(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve Key Vault token")?;

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    let versions = fetch_all_paginated::<Secret>(&url, &client)
        .await
        .with_context(|| {
            format!(
                "Failed to fetch versions for secret '{}' from {}",
                secret_name, keyvault_uri
            )
        })?;

    info!(
        "Successfully fetched {} versions for secret '{}'",
        versions.len(),
        secret_name
    );
    Ok(versions)
}

/// Delete a secret from a Key Vault.
///
/// # Arguments
///
/// * `keyvault_uri` - The Key Vault URI
/// * `secret_name` - The name of the secret to delete
///
/// # Returns
///
/// The deleted secret metadata.
///
/// # Errors
///
/// This function will return an error if:
/// - The user is not authenticated
/// - The secret doesn't exist
/// - Access is denied
pub async fn delete_secret(keyvault_uri: &str, secret_name: &str) -> Result<Secret, String> {
    delete_secret_internal(keyvault_uri, secret_name)
        .await
        .map_err(|e| {
            error!("Failed to delete secret: {}", e);
            // Extract the root cause error message for better user feedback
            if let Some(root_cause) = e.root_cause().downcast_ref::<AzureHttpError>() {
                root_cause.to_string()
            } else {
                e.to_string()
            }
        })
}

async fn delete_secret_internal(keyvault_uri: &str, secret_name: &str) -> Result<Secret> {
    info!("Deleting secret");

    let url = urls::delete_secret(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve Key Vault token")?;

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    let deleted_secret: Secret = client.delete(&url).await.with_context(|| {
        format!(
            "Failed to delete secret '{}' from {}",
            secret_name, keyvault_uri
        )
    })?;

    info!("Secret deleted successfully");
    Ok(deleted_secret)
}

/// Create a new secret in a Key Vault.
///
/// # Arguments
///
/// * `keyvault_uri` - The Key Vault URI
/// * `secret_name` - The name for the new secret
/// * `secret_value` - The secret value
///
/// # Returns
///
/// The created secret bundle.
///
/// # Errors
///
/// This function will return an error if:
/// - The user is not authenticated
/// - Access is denied
/// - A secret with that name already exists (use update instead)
pub async fn create_secret(
    keyvault_uri: &str,
    secret_name: &str,
    secret_value: &str,
) -> Result<SecretBundle, String> {
    create_secret_internal(keyvault_uri, secret_name, secret_value)
        .await
        .map_err(|e| {
            error!("Failed to create secret: {}", e);
            // Extract the root cause error message for better user feedback
            if let Some(root_cause) = e.root_cause().downcast_ref::<AzureHttpError>() {
                root_cause.to_string()
            } else {
                e.to_string()
            }
        })
}

async fn create_secret_internal(
    keyvault_uri: &str,
    secret_name: &str,
    secret_value: &str,
) -> Result<SecretBundle> {
    info!("Creating secret");

    let url = urls::create_secret(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve Key Vault token")?;

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    let body = SecretValue {
        value: secret_value.to_string(),
    };

    let created_secret: SecretBundle = client.put(&url, &body).await.with_context(|| {
        format!(
            "Failed to create secret '{}' in {}",
            secret_name, keyvault_uri
        )
    })?;

    info!("Secret created successfully");
    Ok(created_secret)
}

/// Update an existing secret in a Key Vault.
///
/// # Arguments
///
/// * `keyvault_uri` - The Key Vault URI
/// * `secret_name` - The name of the secret to update
/// * `secret_value` - The new secret value
///
/// # Returns
///
/// The updated secret bundle.
///
/// # Errors
///
/// This function will return an error if:
/// - The user is not authenticated
/// - Access is denied
pub async fn update_secret(
    keyvault_uri: &str,
    secret_name: &str,
    secret_value: &str,
) -> Result<SecretBundle, String> {
    update_secret_internal(keyvault_uri, secret_name, secret_value)
        .await
        .map_err(|e| {
            error!("Failed to update secret: {}", e);
            // Extract the root cause error message for better user feedback
            if let Some(root_cause) = e.root_cause().downcast_ref::<AzureHttpError>() {
                root_cause.to_string()
            } else {
                e.to_string()
            }
        })
}

async fn update_secret_internal(
    keyvault_uri: &str,
    secret_name: &str,
    secret_value: &str,
) -> Result<SecretBundle> {
    info!("Updating secret");

    let url = urls::create_secret(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve Key Vault token")?;

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    let body = SecretValue {
        value: secret_value.to_string(),
    };

    let updated_secret: SecretBundle = client.put(&url, &body).await.with_context(|| {
        format!(
            "Failed to update secret '{}' in {}",
            secret_name, keyvault_uri
        )
    })?;

    info!("Secret updated successfully");
    Ok(updated_secret)
}

// ============================================================================
// Deleted Secret Operations
// ============================================================================

/// Fetch all deleted secrets from a Key Vault.
///
/// Requires soft-delete to be enabled on the vault.
pub async fn get_deleted_secrets(keyvault_uri: &str) -> Result<Vec<DeletedSecretItem>, String> {
    get_deleted_secrets_internal(keyvault_uri)
        .await
        .map_err(|e| {
            error!("Failed to get deleted secrets: {}", e);
            if let Some(root_cause) = e.root_cause().downcast_ref::<AzureHttpError>() {
                root_cause.to_string()
            } else {
                e.to_string()
            }
        })
}

async fn get_deleted_secrets_internal(keyvault_uri: &str) -> Result<Vec<DeletedSecretItem>> {
    info!("Fetching deleted secrets");

    let url = urls::deleted_secrets(keyvault_uri);
    let token = get_token_for_scope(KEYVAULT_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve Key Vault token")?;

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    let deleted_list = fetch_all_paginated::<DeletedSecretItem>(&url, &client)
        .await
        .with_context(|| format!("Failed to fetch deleted secrets from {}", keyvault_uri))?;

    info!(
        "Successfully fetched {} deleted secrets",
        deleted_list.len()
    );
    Ok(deleted_list)
}

/// Get a specific deleted secret with its value.
pub async fn get_deleted_secret(
    keyvault_uri: &str,
    secret_name: &str,
) -> Result<DeletedSecretBundle, String> {
    get_deleted_secret_internal(keyvault_uri, secret_name)
        .await
        .map_err(|e| {
            error!("Failed to get deleted secret: {}", e);
            if let Some(root_cause) = e.root_cause().downcast_ref::<AzureHttpError>() {
                root_cause.to_string()
            } else {
                e.to_string()
            }
        })
}

async fn get_deleted_secret_internal(
    keyvault_uri: &str,
    secret_name: &str,
) -> Result<DeletedSecretBundle> {
    info!("Fetching deleted secret '{}'", secret_name);

    let url = urls::deleted_secret(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve Key Vault token")?;

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    let deleted_secret: DeletedSecretBundle =
        client.get(&url).await.with_context(|| {
            format!(
                "Failed to fetch deleted secret '{}' from {}",
                secret_name, keyvault_uri
            )
        })?;

    info!("Deleted secret fetched successfully");
    Ok(deleted_secret)
}

/// Recover a deleted secret back to active state.
///
/// This is only possible if the vault has soft-delete enabled
/// and the secret hasn't been purged yet.
pub async fn recover_deleted_secret(
    keyvault_uri: &str,
    secret_name: &str,
) -> Result<Secret, String> {
    recover_deleted_secret_internal(keyvault_uri, secret_name)
        .await
        .map_err(|e| {
            error!("Failed to recover deleted secret: {}", e);
            if let Some(root_cause) = e.root_cause().downcast_ref::<AzureHttpError>() {
                root_cause.to_string()
            } else {
                e.to_string()
            }
        })
}

async fn recover_deleted_secret_internal(
    keyvault_uri: &str,
    secret_name: &str,
) -> Result<Secret> {
    info!("Recovering deleted secret '{}'", secret_name);

    let url = urls::recover_deleted_secret(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve Key Vault token")?;

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    // The recover API is a POST with an empty body and returns Secret (without value)
    let recovered_secret: Secret = client
        .post(&url, &serde_json::json!({}))
        .await
        .with_context(|| {
            format!(
                "Failed to recover deleted secret '{}' from {}",
                secret_name, keyvault_uri
            )
        })?;

    info!("Secret '{}' recovered successfully", secret_name);
    Ok(recovered_secret)
}

/// Permanently delete (purge) a deleted secret.
///
/// This is irreversible. Only possible if the vault does NOT have
/// purge protection enabled, or the scheduled purge date has passed.
pub async fn purge_deleted_secret(
    keyvault_uri: &str,
    secret_name: &str,
) -> Result<(), String> {
    purge_deleted_secret_internal(keyvault_uri, secret_name)
        .await
        .map_err(|e| {
            error!("Failed to purge deleted secret: {}", e);
            if let Some(root_cause) = e.root_cause().downcast_ref::<AzureHttpError>() {
                root_cause.to_string()
            } else {
                e.to_string()
            }
        })
}

async fn purge_deleted_secret_internal(
    keyvault_uri: &str,
    secret_name: &str,
) -> Result<()> {
    info!("Purging deleted secret '{}'", secret_name);

    let url = urls::purge_deleted_secret(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to retrieve Key Vault token")?;

    let client =
        AzureHttpClient::with_token(&token).context("Failed to create HTTP client with token")?;

    // Purge uses DELETE and returns 204 No Content on success
    client.delete_no_content(&url).await.with_context(|| {
        format!(
            "Failed to purge deleted secret '{}' from {}",
            secret_name, keyvault_uri
        )
    })?;

    info!("Secret '{}' purged successfully", secret_name);
    Ok(())
}

// ============================================================================
// Global Search Operations
// ============================================================================

/// Determines which search modes are active
#[derive(Clone)]
struct SearchConfig {
    query_lower: String,
    search_in_keys: bool,
    search_in_values: bool,
    search_type: String,
}

impl SearchConfig {
    fn new(query: &str, search_type: &str) -> Self {
        Self {
            query_lower: query.to_lowercase(),
            search_in_keys: search_type == "key" || search_type == "both",
            search_in_values: search_type == "value" || search_type == "both",
            search_type: search_type.to_string(),
        }
    }
}

/// Extract secret name from the full secret ID URL
fn extract_secret_name(secret_id: &str) -> String {
    secret_id
        .split('/')
        .last()
        .unwrap_or(secret_id)
        .to_string()
}

/// Determine the match type based on which fields matched
fn determine_match_type(name_matches: bool, value_matches: bool) -> &'static str {
    match (name_matches, value_matches) {
        (true, true) => "both",
        (true, false) => "key",
        (false, true) => "value",
        (false, false) => "none",
    }
}

/// Process a single secret and return a search result if it matches
async fn process_secret(
    secret: super::types::Secret,
    vault_uri: String,
    vault_name: String,
    subscription_id: String,
    config: SearchConfig,
) -> Option<crate::commands::keyvault::SearchResult> {
    let secret_name = extract_secret_name(&secret.id);
    let name_lower = secret_name.to_lowercase();
    let name_matches = name_lower.contains(&config.query_lower);

    // Fast path: key-only search with name match
    if config.search_in_keys && !config.search_in_values && name_matches {
        return Some(crate::commands::keyvault::SearchResult {
            secret_id: secret.id.clone(),
            secret_name,
            vault_name,
            vault_uri,
            subscription_id,
            match_type: "key".to_string(),
            secret_value: None,
            attributes: secret.attributes,
        });
    }

    // Value search path
    if config.search_in_values {
        return process_secret_with_value(
            secret,
            secret_name,
            vault_uri,
            vault_name,
            subscription_id,
            name_matches,
            config,
        )
        .await;
    }

    None
}

/// Process a secret that requires value fetching
async fn process_secret_with_value(
    secret: super::types::Secret,
    secret_name: String,
    vault_uri: String,
    vault_name: String,
    subscription_id: String,
    name_matches: bool,
    config: SearchConfig,
) -> Option<crate::commands::keyvault::SearchResult> {
    // Use cache for secret value
    let uri_clone = vault_uri.clone();
    let name_clone = secret_name.clone();
    let secret_result = crate::cache::AZURE_CACHE
        .get_secret_value_or_load(&vault_uri, &secret_name, || async move {
            get_secret(&uri_clone, &name_clone, None).await
        })
        .await;

    match secret_result {
        Ok(secret_bundle) => {
            let value_lower = secret_bundle.value.to_lowercase();
            let value_matches = value_lower.contains(&config.query_lower);

            let should_include = match config.search_type.as_str() {
                "value" => value_matches,
                _ => name_matches || value_matches, // "both"
            };

            if should_include {
                Some(crate::commands::keyvault::SearchResult {
                    secret_id: secret.id,
                    secret_name,
                    vault_name,
                    vault_uri,
                    subscription_id,
                    match_type: determine_match_type(name_matches, value_matches).to_string(),
                    secret_value: Some(secret_bundle.value),
                    attributes: secret.attributes,
                })
            } else {
                None
            }
        }
        Err(e) => {
            error!("Failed to fetch value for secret '{}': {}", secret_name, e);

            // If in "both" mode and name matches, still include it
            if config.search_type == "both" && name_matches {
                Some(crate::commands::keyvault::SearchResult {
                    secret_id: secret.id,
                    secret_name,
                    vault_name,
                    vault_uri,
                    subscription_id,
                    match_type: "key".to_string(),
                    secret_value: None,
                    attributes: secret.attributes,
                })
            } else {
                None
            }
        }
    }
}

/// Search all secrets in a single vault
async fn search_vault(
    vault_uri: String,
    vault_name: String,
    subscription_id: String,
    config: SearchConfig,
) -> Vec<crate::commands::keyvault::SearchResult> {
    use futures::stream::{self, StreamExt};

    // Fetch secrets list for this vault using cache
    let uri_clone = vault_uri.clone();
    let secrets = match crate::cache::AZURE_CACHE
        .get_secrets_list_or_load(&vault_uri, || async move {
            get_secrets(&uri_clone).await
        })
        .await
    {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to fetch secrets from {}: {}", vault_name, e);
            return Vec::new();
        }
    };

    // Process secrets in parallel within this vault
    let results: Vec<Option<crate::commands::keyvault::SearchResult>> = stream::iter(secrets)
        .map(|secret| {
            let vault_uri = vault_uri.clone();
            let vault_name = vault_name.clone();
            let subscription_id = subscription_id.clone();
            let config = config.clone();
            async move {
                process_secret(secret, vault_uri, vault_name, subscription_id, config).await
            }
        })
        .buffer_unordered(20) // Process up to 20 secrets concurrently per vault
        .collect()
        .await;

    // Filter out None values
    let vault_results: Vec<_> = results.into_iter().flatten().collect();

    info!(
        "Found {} matching secrets in {}",
        vault_results.len(),
        vault_name
    );

    vault_results
}

/// Global search across multiple key vaults with parallelization.
///
/// This function processes vaults in parallel (up to 10 at a time), and within
/// each vault, processes secrets in parallel (up to 20 at a time) for maximum performance.
pub async fn global_search_secrets(
    vault_uris: Vec<String>,
    vault_names: Vec<String>,
    subscription_ids: Vec<String>,
    query: &str,
    search_type: &str,
) -> Result<Vec<crate::commands::keyvault::SearchResult>, String> {
    use futures::stream::{self, StreamExt};

    info!(
        "Starting global search across {} vaults for query: '{}' (type: {})",
        vault_uris.len(),
        query,
        search_type
    );

    let config = SearchConfig::new(query, search_type);

    // Create tuples of (vault_uri, vault_name, subscription_id)
    let vault_data: Vec<(String, String, String)> = vault_uris
        .into_iter()
        .zip(vault_names.into_iter())
        .zip(subscription_ids.into_iter())
        .map(|((uri, name), sub_id)| (uri, name, sub_id))
        .collect();

    // Process vaults in parallel with a concurrency limit
    let results: Vec<Vec<crate::commands::keyvault::SearchResult>> = stream::iter(
        vault_data.into_iter().enumerate(),
    )
    .map(|(idx, (vault_uri, vault_name, subscription_id))| {
        let config = config.clone();
        async move {
            info!("Searching vault {}: {}", idx + 1, vault_name);
            search_vault(vault_uri, vault_name, subscription_id, config).await
        }
    })
    .buffer_unordered(10) // Process up to 10 vaults concurrently
    .collect()
    .await;

    // Flatten all results
    let all_results: Vec<crate::commands::keyvault::SearchResult> =
        results.into_iter().flatten().collect();

    info!("Global search complete: {} total matches", all_results.len());
    Ok(all_results)
}
