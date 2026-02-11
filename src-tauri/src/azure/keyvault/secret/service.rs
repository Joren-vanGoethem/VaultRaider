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
// #[instrument(
//     name = "secret.list",
//     skip(keyvault_uri),
//     fields(
//         keyvault.uri = %keyvault_uri,
//         secret_count = tracing::field::Empty,
//         otel.kind = "client",
//     )
// )]
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
// #[instrument(
//     name = "secret.get",
//     skip(keyvault_uri, secret_name, secret_version),
//     fields(
//         keyvault.uri = %keyvault_uri,
//         secret.name = %secret_name,
//         secret.version = ?secret_version,
//         otel.kind = "client",
//     )
// )]
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
// #[instrument(
//     name = "secret.delete",
//     skip(keyvault_uri, secret_name),
//     fields(
//         keyvault.uri = %keyvault_uri,
//         secret.name = %secret_name,
//         otel.kind = "client",
//     )
// )]
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
// #[instrument(
//     name = "secret.create",
//     skip(keyvault_uri, secret_name, secret_value),
//     fields(
//         keyvault.uri = %keyvault_uri,
//         secret.name = %secret_name,
//         otel.kind = "client",
//     )
// )]
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
// #[instrument(
//     name = "secret.update",
//     skip(keyvault_uri, secret_name, secret_value),
//     fields(
//         keyvault.uri = %keyvault_uri,
//         secret.name = %secret_name,
//         otel.kind = "client",
//     )
// )]
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

/// Global search across multiple key vaults with parallelization
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

    let query_lower = query.to_lowercase();
    let search_in_keys = search_type == "key" || search_type == "both";
    let search_in_values = search_type == "value" || search_type == "both";

    // Create tuples of (vault_uri, vault_name, subscription_id)
    let vault_data: Vec<(String, String, String)> = vault_uris
        .into_iter()
        .zip(vault_names.into_iter())
        .zip(subscription_ids.into_iter())
        .map(|((uri, name), sub_id)| (uri, name, sub_id))
        .collect();

    // Process vaults in parallel with a concurrency limit
    let results: Vec<Vec<crate::commands::keyvault::SearchResult>> = stream::iter(
        vault_data.into_iter().enumerate()
    )
    .map(|(idx, (vault_uri, vault_name, subscription_id))| {
        let query_lower_clone = query_lower.clone();
        let search_type_owned = search_type.to_string();
        async move {
            info!("Searching vault {}: {}", idx + 1, vault_name);

            // Fetch secrets list for this vault
            let secrets = match get_secrets(&vault_uri).await {
                Ok(s) => s,
                Err(e) => {
                    error!("Failed to fetch secrets from {}: {}", vault_name, e);
                    return Vec::new();
                }
            };

            let mut vault_results = Vec::new();

            for secret in secrets {
                // Extract secret name from ID
                let secret_name = secret
                    .id
                    .split('/')
                    .last()
                    .unwrap_or(&secret.id)
                    .to_string();

                let name_lower = secret_name.to_lowercase();
                let name_matches = name_lower.contains(&query_lower_clone);

                // If searching by key only and name matches, add result
                if search_in_keys && !search_in_values && name_matches {
                    vault_results.push(crate::commands::keyvault::SearchResult {
                        secret_id: secret.id.clone(),
                        secret_name: secret_name.clone(),
                        vault_name: vault_name.clone(),
                        vault_uri: vault_uri.clone(),
                        subscription_id: subscription_id.clone(),
                        match_type: "key".to_string(),
                        secret_value: None,
                        attributes: secret.attributes.clone(),
                    });
                }
                // If searching by value or both, fetch the value
                else if search_in_values {
                    match get_secret(&vault_uri, &secret_name, None).await {
                        Ok(secret_bundle) => {
                            let value_lower = secret_bundle.value.to_lowercase();
                            let value_matches = value_lower.contains(&query_lower_clone);

                            let should_include = if search_type_owned == "value" {
                                value_matches
                            } else {
                                // "both" - include if either matches
                                name_matches || value_matches
                            };

                            if should_include {
                                let match_type = if name_matches && value_matches {
                                    "both"
                                } else if name_matches {
                                    "key"
                                } else {
                                    "value"
                                };

                                vault_results.push(crate::commands::keyvault::SearchResult {
                                    secret_id: secret.id.clone(),
                                    secret_name,
                                    vault_name: vault_name.clone(),
                                    vault_uri: vault_uri.clone(),
                                    subscription_id: subscription_id.clone(),
                                    match_type: match_type.to_string(),
                                    secret_value: Some(secret_bundle.value),
                                    attributes: secret.attributes,
                                });
                            }
                        }
                        Err(e) => {
                            // Log error but continue with other secrets
                            error!("Failed to fetch value for secret '{}': {}", secret_name, e);

                            // If in "both" mode and name matches, still include it
                            if search_type_owned == "both" && name_matches {
                                vault_results.push(crate::commands::keyvault::SearchResult {
                                    secret_id: secret.id.clone(),
                                    secret_name,
                                    vault_name: vault_name.clone(),
                                    vault_uri: vault_uri.clone(),
                                    subscription_id: subscription_id.clone(),
                                    match_type: "key".to_string(),
                                    secret_value: None,
                                    attributes: secret.attributes,
                                });
                            }
                        }
                    }
                }
            }

            info!(
                "Found {} matching secrets in {}",
                vault_results.len(),
                vault_name
            );
            vault_results
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
