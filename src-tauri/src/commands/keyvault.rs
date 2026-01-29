//! Key Vault related Tauri commands

use crate::azure::keyvault::service::{get_keyvaults};
use crate::azure::keyvault::types::{KeyVault, KeyVaultAccessCheck};
use crate::azure::keyvault::secret::types::{Secret, SecretBundle};

/// Fetch all Key Vaults for a subscription
#[tauri::command]
pub async fn fetch_keyvaults(subscription_id: String) -> Result<Vec<KeyVault>, String> {
    get_keyvaults(&subscription_id).await
}

/// Check if we have access to a specific Key Vault
#[tauri::command]
pub async fn check_keyvault_access(keyvault_uri: String) -> Result<KeyVaultAccessCheck, String> {
    crate::azure::keyvault::service::check_keyvault_access(&keyvault_uri).await
}

/// Create a new Key Vault
#[tauri::command]
pub async fn create_keyvault(
    subscription_id: String,
    resource_group: String,
    keyvault_name: String,
) -> Result<KeyVault, String> {
    crate::azure::keyvault::service::create_keyvault(&subscription_id, &resource_group, &keyvault_name).await
}

/// Fetch all secrets from a Key Vault
#[tauri::command]
pub async fn get_secrets(keyvault_uri: String) -> Result<Vec<Secret>, String> {
    crate::azure::keyvault::secret::service::get_secrets(&keyvault_uri).await
}

/// Fetch a specific secret
#[tauri::command]
pub async fn get_secret(
    keyvault_uri: String,
    secret_name: String,
    secret_version: Option<String>,
) -> Result<SecretBundle, String> {
    crate::azure::keyvault::secret::service::get_secret(&keyvault_uri, &secret_name, secret_version.as_deref()).await
}

/// Delete a secret
#[tauri::command]
pub async fn delete_secret(keyvault_uri: String, secret_name: String) -> Result<Secret, String> {
    crate::azure::keyvault::secret::service::delete_secret(&keyvault_uri, &secret_name).await
}

/// Create a new secret
#[tauri::command]
pub async fn create_secret(
    keyvault_uri: String,
    secret_name: String,
    secret_value: String,
) -> Result<SecretBundle, String> {
    crate::azure::keyvault::secret::service::create_secret(&keyvault_uri, &secret_name, &secret_value).await
}

/// Update an existing secret
#[tauri::command]
pub async fn update_secret(
    keyvault_uri: String,
    secret_name: String,
    secret_value: String,
) -> Result<SecretBundle, String> {
    crate::azure::keyvault::secret::service::update_secret(&keyvault_uri, &secret_name, &secret_value).await
}
