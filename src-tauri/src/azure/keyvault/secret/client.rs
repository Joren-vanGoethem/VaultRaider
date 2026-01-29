use log::info;
use serde::Serialize;

use crate::azure::auth::token::get_token_for_scope;
use crate::azure::http::{fetch_all_paginated, AzureHttpClient};
use crate::azure::keyvault::constants::KEYVAULT_TOKEN_SCOPE;
use crate::azure::keyvault::secret::constants::{
    create_secret_uri, delete_secret_uri, get_secret_version_uri, get_secrets_uri,
};
use crate::azure::keyvault::secret::types::{Secret, SecretBundle};

/// Request body for creating/updating a secret
#[derive(Serialize)]
struct SecretValue {
    value: String,
}

#[tauri::command]
pub async fn get_secrets(keyvault_uri: &str) -> Result<Vec<Secret>, String> {
    info!("Fetching secrets...");

    let url = get_secrets_uri(keyvault_uri);
    let token = get_token_for_scope(KEYVAULT_TOKEN_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let secret_list = fetch_all_paginated::<Secret>(&url, &client)
        .await
        .map_err(|e| e.to_string())?;

    Ok(secret_list)
}


#[tauri::command]
pub async fn get_secret(
    keyvault_uri: &str,
    secret_name: &str,
    secret_version: Option<&str>,
) -> Result<SecretBundle, String> {
    info!("Fetching secret {}...", secret_name);

    let url = get_secret_version_uri(keyvault_uri, secret_name, secret_version);
    let token = get_token_for_scope(KEYVAULT_TOKEN_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let secret: SecretBundle = client.get(&url).await.map_err(|e| e.to_string())?;

    Ok(secret)
}

#[tauri::command]
pub async fn delete_secret(keyvault_uri: &str, secret_name: &str) -> Result<Secret, String> {
    info!("Deleting secret {}...", secret_name);

    let url = delete_secret_uri(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_TOKEN_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let deleted_secret: Secret = client.delete(&url).await.map_err(|e| e.to_string())?;

    Ok(deleted_secret)
}

#[tauri::command]
pub async fn create_secret(
    keyvault_uri: &str,
    secret_name: &str,
    secret_value: &str,
) -> Result<SecretBundle, String> {
    info!("Adding secret {}...", secret_name);

    let url = create_secret_uri(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_TOKEN_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let body = SecretValue {
        value: secret_value.to_string(),
    };

    info!("Create secret request sending...");

    let created_secret: SecretBundle = client.put(&url, &body).await.map_err(|e| e.to_string())?;

    info!("Secret added {}...", secret_name);

    Ok(created_secret)
}

#[tauri::command]
pub async fn update_secret(
    keyvault_uri: &str,
    secret_name: &str,
    secret_value: &str,
) -> Result<SecretBundle, String> {
    info!("Updating secret {}...", secret_name);

    let url = create_secret_uri(keyvault_uri, secret_name);
    let token = get_token_for_scope(KEYVAULT_TOKEN_SCOPE).await?;
    let client = AzureHttpClient::with_token(&token).map_err(|e| e.to_string())?;

    let body = SecretValue {
        value: secret_value.to_string(),
    };

    info!("Update secret request sending...");

    let updated_secret: SecretBundle = client.put(&url, &body).await.map_err(|e| e.to_string())?;

    info!("Secret updated {}...", secret_name);

    Ok(updated_secret)
}
