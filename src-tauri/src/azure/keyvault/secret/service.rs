//! Secret service - business logic for Key Vault secret operations

use anyhow::{Context, Result};
use log::{error, info};
use serde::Serialize;

use crate::azure::auth::token::get_token_for_scope;
use crate::azure::http::{fetch_all_paginated, AzureHttpClient, AzureHttpError};
use crate::config::{urls, KEYVAULT_SCOPE};

use super::types::{Secret, SecretBundle};

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
