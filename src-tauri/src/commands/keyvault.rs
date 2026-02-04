//! Key Vault related Tauri commands

use serde::{Deserialize, Serialize};
use crate::azure::keyvault::service::{get_keyvaults};
use crate::azure::keyvault::types::{KeyVault, KeyVaultAccessCheck};
use crate::azure::keyvault::secret::types::{Secret, SecretBundle};

/// Export format options
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportOptions {
    pub format: String,
    pub include_value: bool,
    pub include_enabled: bool,
    pub include_created: bool,
    pub include_updated: bool,
    pub include_recovery_level: bool,
}

/// Exported secret data
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportedSecret {
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    value: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    attributes: Option<ExportedAttributes>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportedAttributes {
    #[serde(skip_serializing_if = "Option::is_none")]
    enabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    created: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    updated: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recovery_level: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FullExport {
    vault_name: String,
    vault_uri: String,
    exported_at: String,
    secrets: Vec<ExportedSecret>,
}

#[derive(Debug, Clone, Serialize)]
struct SimpleExport {
    secrets: Vec<SimpleSecret>,
}

#[derive(Debug, Clone, Serialize)]
struct SimpleSecret {
    name: String,
    value: String,
}

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

/// Export secrets to a formatted string
#[tauri::command]
pub async fn export_secrets(
    vault_name: String,
    vault_uri: String,
    options: ExportOptions,
) -> Result<String, String> {
    use crate::azure::keyvault::secret::service::{get_secrets, get_secret};
    use std::collections::HashMap;

    // Get all secrets metadata
    let secrets = get_secrets(&vault_uri).await?;

    // Helper to extract secret name from ID
    fn get_secret_name(id: &str) -> String {
        id.split('/').last().unwrap_or("").to_string()
    }

    // Fetch secret values if needed
    let mut secrets_with_values: Vec<(String, Option<String>, Secret)> = Vec::new();

    for secret in secrets {
        let name = get_secret_name(&secret.id);
        let value = if options.include_value {
            match get_secret(&vault_uri, &name, None).await {
                Ok(bundle) => Some(bundle.value),
                Err(_) => Some(String::new()),
            }
        } else {
            None
        };
        secrets_with_values.push((name, value, secret));
    }

    // Generate output based on format
    let output = match options.format.as_str() {
        "full" => {
            let exported_secrets: Vec<ExportedSecret> = secrets_with_values
                .iter()
                .map(|(name, value, secret)| {
                    let attrs = if options.include_enabled || options.include_created || options.include_updated || options.include_recovery_level {
                        Some(ExportedAttributes {
                            enabled: if options.include_enabled { Some(secret.attributes.enabled) } else { None },
                            created: if options.include_created {
                                Some(chrono_format_timestamp(secret.attributes.created))
                            } else { None },
                            updated: if options.include_updated {
                                Some(chrono_format_timestamp(secret.attributes.updated))
                            } else { None },
                            recovery_level: if options.include_recovery_level {
                                Some(secret.attributes.recovery_level.clone())
                            } else { None },
                        })
                    } else {
                        None
                    };

                    ExportedSecret {
                        name: name.clone(),
                        value: value.clone(),
                        attributes: attrs,
                    }
                })
                .collect();

            let export = FullExport {
                vault_name,
                vault_uri,
                exported_at: chrono::Utc::now().to_rfc3339(),
                secrets: exported_secrets,
            };

            serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?
        }
        "simple" => {
            let simple_secrets: Vec<SimpleSecret> = secrets_with_values
                .iter()
                .map(|(name, value, _)| SimpleSecret {
                    name: name.clone(),
                    value: value.clone().unwrap_or_default(),
                })
                .collect();

            let export = SimpleExport { secrets: simple_secrets };
            serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?
        }
        "keyValue" => {
            let kv: HashMap<String, String> = secrets_with_values
                .iter()
                .map(|(name, value, _)| (name.clone(), value.clone().unwrap_or_default()))
                .collect();

            serde_json::to_string_pretty(&kv).map_err(|e| e.to_string())?
        }
        "dotenv" => {
            secrets_with_values
                .iter()
                .map(|(name, value, _)| {
                    let env_name = name.to_uppercase().replace('-', "_");
                    let env_value = value.clone().unwrap_or_default();
                    format!("{}=\"{}\"", env_name, env_value)
                })
                .collect::<Vec<_>>()
                .join("\n")
        }
        _ => return Err("Unknown export format".to_string()),
    };

    Ok(output)
}

fn chrono_format_timestamp(timestamp: u64) -> String {
    use chrono::{DateTime, Utc};
    DateTime::<Utc>::from_timestamp(timestamp as i64, 0)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| timestamp.to_string())
}

