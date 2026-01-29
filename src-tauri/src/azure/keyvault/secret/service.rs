//! Secret service - business logic for Key Vault secret operations

use serde::Serialize;
use tracing::{info, instrument, Span};

use crate::azure::auth::token::get_token_for_scope;
use crate::azure::http::{fetch_all_paginated, AzureHttpClient};
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
#[instrument(
    name = "secret.list",
    skip(keyvault_uri),
    fields(
        keyvault.uri = %keyvault_uri,
        secret_count = tracing::field::Empty,
        otel.kind = "client",
    )
)]
pub async fn get_secrets(keyvault_uri: &str) -> Result<Vec<Secret>, String> {
    info!("Fetching secrets");

    let url = urls::secrets(keyvault_uri);
    let token = get_token_for_scope(KEYVAULT_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let secret_list = fetch_all_paginated::<Secret>(&url, &client)
        .await
        .map_err(|e| e.to_string())?;

    Span::current().record("secret_count", secret_list.len());
    info!(count = secret_list.len(), "Successfully fetched secrets");
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
#[instrument(
    name = "secret.get",
    skip(keyvault_uri, secret_name, secret_version),
    fields(
        keyvault.uri = %keyvault_uri,
        secret.name = %secret_name,
        secret.version = ?secret_version,
        otel.kind = "client",
    )
)]
pub async fn get_secret(
    keyvault_uri: &str,
    secret_name: &str,
    secret_version: Option<&str>,
) -> Result<SecretBundle, String> {
    info!("Fetching secret");

    let url = urls::secret(keyvault_uri, secret_name, secret_version);
    let token = get_token_for_scope(KEYVAULT_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let secret: SecretBundle = client.get(&url).await.map_err(|e| e.to_string())?;

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
#[instrument(
    name = "secret.delete",
    skip(keyvault_uri, secret_name),
    fields(
        keyvault.uri = %keyvault_uri,
        secret.name = %secret_name,
        otel.kind = "client",
    )
)]
pub async fn delete_secret(keyvault_uri: &str, secret_name: &str) -> Result<Secret, String> {
    info!("Deleting secret");

    let url = urls::delete_secret(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let deleted_secret: Secret = client.delete(&url).await.map_err(|e| e.to_string())?;

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
#[instrument(
    name = "secret.create",
    skip(keyvault_uri, secret_name, secret_value),
    fields(
        keyvault.uri = %keyvault_uri,
        secret.name = %secret_name,
        otel.kind = "client",
    )
)]
pub async fn create_secret(
    keyvault_uri: &str,
    secret_name: &str,
    secret_value: &str,
) -> Result<SecretBundle, String> {
    info!("Creating secret");

    let url = urls::create_secret(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let body = SecretValue {
        value: secret_value.to_string(),
    };

    let created_secret: SecretBundle = client.put(&url, &body).await.map_err(|e| e.to_string())?;

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
#[instrument(
    name = "secret.update",
    skip(keyvault_uri, secret_name, secret_value),
    fields(
        keyvault.uri = %keyvault_uri,
        secret.name = %secret_name,
        otel.kind = "client",
    )
)]
pub async fn update_secret(
    keyvault_uri: &str,
    secret_name: &str,
    secret_value: &str,
) -> Result<SecretBundle, String> {
    info!("Updating secret");

    let url = urls::create_secret(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let body = SecretValue {
        value: secret_value.to_string(),
    };

    let updated_secret: SecretBundle = client.put(&url, &body).await.map_err(|e| e.to_string())?;

    info!("Secret updated successfully");
    Ok(updated_secret)
}
