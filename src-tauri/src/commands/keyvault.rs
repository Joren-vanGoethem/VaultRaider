//! Key Vault related Tauri commands

use crate::azure::keyvault::secret::export::ExportOptions;
use crate::azure::keyvault::secret::import::ImportedSecret;
use crate::azure::keyvault::secret::types::{DeletedSecretItem, Secret, SecretBundle};
use crate::azure::keyvault::service::get_keyvaults;
use crate::azure::keyvault::types::{KeyVault, KeyVaultAccessCheck};
use crate::cache::AZURE_CACHE;

/// Fetch all Key Vaults for a subscription
/// Uses caching with automatic loading on cache miss
#[tauri::command]
pub async fn fetch_keyvaults(subscription_id: String) -> Result<Vec<KeyVault>, String> {
    let sub_id = subscription_id.clone();
    AZURE_CACHE
        .get_keyvaults_or_load(
            &subscription_id,
            || async move { get_keyvaults(&sub_id).await },
        )
        .await
}

/// Check if we have access to a specific Key Vault
#[tauri::command]
pub async fn check_keyvault_access(keyvault_uri: String) -> Result<KeyVaultAccessCheck, String> {
    crate::azure::keyvault::service::check_keyvault_access(&keyvault_uri).await
}

/// Create a new Key Vault
/// Invalidates the keyvaults cache after successful creation
#[tauri::command]
pub async fn create_keyvault(
    subscription_id: String,
    resource_group: String,
    keyvault_name: String,
) -> Result<KeyVault, String> {
    let result = crate::azure::keyvault::service::create_keyvault(
        &subscription_id,
        &resource_group,
        &keyvault_name,
    )
    .await;

    if result.is_ok() {
        // Invalidate keyvaults cache for this subscription
        AZURE_CACHE.invalidate_keyvaults(&subscription_id).await;
    }

    result
}

/// Delete a Key Vault
/// Invalidates the keyvaults cache after successful deletion
#[tauri::command]
pub async fn delete_keyvault(
    subscription_id: String,
    resource_group: String,
    keyvault_name: String,
) -> Result<(), String> {
    let result = crate::azure::keyvault::service::delete_keyvault(
        &subscription_id,
        &resource_group,
        &keyvault_name,
    )
    .await;

    if result.is_ok() {
        // Invalidate keyvaults cache for this subscription
        AZURE_CACHE.invalidate_keyvaults(&subscription_id).await;
    }

    result
}

/// Fetch all secrets from a Key Vault
/// Uses caching with automatic loading on cache miss
#[tauri::command]
pub async fn get_secrets(keyvault_uri: String) -> Result<Vec<Secret>, String> {
    let uri = keyvault_uri.clone();
    AZURE_CACHE
        .get_secrets_list_or_load(&keyvault_uri, || async move {
            crate::azure::keyvault::secret::service::get_secrets(&uri).await
        })
        .await
}

/// Fetch a specific secret
/// Uses caching with automatic loading on cache miss (only for latest version)
#[tauri::command]
pub async fn get_secret(
    keyvault_uri: String,
    secret_name: String,
    secret_version: Option<String>,
) -> Result<SecretBundle, String> {
    // Only cache latest version (when no specific version is requested)
    if secret_version.is_none() {
        let uri = keyvault_uri.clone();
        let name = secret_name.clone();
        AZURE_CACHE
            .get_secret_value_or_load(&keyvault_uri, &secret_name, || async move {
                crate::azure::keyvault::secret::service::get_secret(&uri, &name, None).await
            })
            .await
    } else {
        // Don't cache specific versions
        crate::azure::keyvault::secret::service::get_secret(
            &keyvault_uri,
            &secret_name,
            secret_version.as_deref(),
        )
        .await
    }
}

/// Fetch all versions of a specific secret
#[tauri::command]
pub async fn get_secret_versions(
    keyvault_uri: String,
    secret_name: String,
) -> Result<Vec<Secret>, String> {
    crate::azure::keyvault::secret::service::get_secret_versions(&keyvault_uri, &secret_name).await
}

/// Delete a secret
/// Invalidates the cache after successful deletion
#[tauri::command]
pub async fn delete_secret(keyvault_uri: String, secret_name: String) -> Result<Secret, String> {
    let result =
        crate::azure::keyvault::secret::service::delete_secret(&keyvault_uri, &secret_name).await;

    if result.is_ok() {
        // Invalidate both the secret value and the secrets list cache
        AZURE_CACHE
            .invalidate_secret_value(&keyvault_uri, &secret_name)
            .await;
        AZURE_CACHE.invalidate_secrets_list(&keyvault_uri).await;
    }

    result
}

/// Create a new secret
/// Caches the new secret and invalidates the secrets list cache
#[tauri::command]
pub async fn create_secret(
    keyvault_uri: String,
    secret_name: String,
    secret_value: String,
) -> Result<SecretBundle, String> {
    let result = crate::azure::keyvault::secret::service::create_secret(
        &keyvault_uri,
        &secret_name,
        &secret_value,
    )
    .await;

    if let Ok(ref secret_bundle) = result {
        // Cache the new secret value
        AZURE_CACHE
            .cache_secret_value(&keyvault_uri, secret_bundle.clone())
            .await;
        // Invalidate secrets list so it gets refreshed
        AZURE_CACHE.invalidate_secrets_list(&keyvault_uri).await;
    }

    result
}

/// Update an existing secret
/// Invalidates old cache and caches the updated secret
#[tauri::command]
pub async fn update_secret(
    keyvault_uri: String,
    secret_name: String,
    secret_value: String,
) -> Result<SecretBundle, String> {
    let result = crate::azure::keyvault::secret::service::update_secret(
        &keyvault_uri,
        &secret_name,
        &secret_value,
    )
    .await;

    if let Ok(ref secret_bundle) = result {
        // Invalidate the old cached secret value
        AZURE_CACHE
            .invalidate_secret_value(&keyvault_uri, &secret_name)
            .await;
        // Cache the updated secret value
        AZURE_CACHE
            .cache_secret_value(&keyvault_uri, secret_bundle.clone())
            .await;
        // Invalidate secrets list so updated timestamp is refreshed
        AZURE_CACHE.invalidate_secrets_list(&keyvault_uri).await;
    }

    result
}

/// Export secrets to a formatted string
#[tauri::command]
pub async fn export_secrets(
    vault_name: String,
    vault_uri: String,
    options: ExportOptions,
) -> Result<String, String> {
    crate::azure::keyvault::secret::export::export_secrets(&vault_name, &vault_uri, options).await
}

/// Parse an import file and extract secrets
#[tauri::command]
pub fn parse_import_file(
    content: String,
    format: Option<String>,
) -> Result<Vec<ImportedSecret>, String> {
    crate::azure::keyvault::secret::import::parse_import_file(&content, format.as_deref())
}

/// Fetch all deleted secrets from a Key Vault
#[tauri::command]
pub async fn get_deleted_secrets(keyvault_uri: String) -> Result<Vec<DeletedSecretItem>, String> {
    crate::azure::keyvault::secret::service::get_deleted_secrets(&keyvault_uri).await
}

/// Recover a deleted secret back to active state
/// Invalidates relevant caches after successful recovery
#[tauri::command]
pub async fn recover_deleted_secret(
    keyvault_uri: String,
    secret_name: String,
) -> Result<Secret, String> {
    let result =
        crate::azure::keyvault::secret::service::recover_deleted_secret(&keyvault_uri, &secret_name)
            .await;

    if result.is_ok() {
        // Invalidate secrets list so the recovered secret shows up
        AZURE_CACHE.invalidate_secrets_list(&keyvault_uri).await;
    }

    result
}

/// Permanently delete (purge) a deleted secret
#[tauri::command]
pub async fn purge_deleted_secret(
    keyvault_uri: String,
    secret_name: String,
) -> Result<(), String> {
    crate::azure::keyvault::secret::service::purge_deleted_secret(&keyvault_uri, &secret_name).await
}

/// Search result for global search across key vaults
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub secret_id: String,
    pub secret_name: String,
    pub vault_name: String,
    pub vault_uri: String,
    pub subscription_id: String,
    pub match_type: String, // "key", "value", or "both"
    pub secret_value: Option<String>,
    pub attributes: crate::azure::keyvault::secret::types::SecretAttributes,
}

/// Global search across multiple key vaults
/// Parallelizes requests to Azure for better performance
#[tauri::command]
pub async fn global_search_secrets(
    vault_uris: Vec<String>,
    vault_names: Vec<String>,
    subscription_ids: Vec<String>,
    query: String,
    search_type: String, // "key", "value", or "both"
) -> Result<Vec<SearchResult>, String> {
    crate::azure::keyvault::secret::service::global_search_secrets(
        vault_uris,
        vault_names,
        subscription_ids,
        &query,
        &search_type,
    )
    .await
}

