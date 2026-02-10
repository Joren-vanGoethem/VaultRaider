//! Secret export functionality - business logic for exporting secrets in various formats

use super::service::{get_secret, get_secrets};
use super::types::Secret;
use crate::cache::AZURE_CACHE;
use anyhow::{Context, Result};
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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

/// Export secrets from a Key Vault in the specified format.
///
/// # Arguments
///
/// * `vault_name` - The name of the Key Vault
/// * `vault_uri` - The Key Vault URI
/// * `options` - Export options including format and fields to include
///
/// # Returns
///
/// A formatted string containing the exported secrets.
///
/// # Errors
///
/// This function will return an error if:
/// - The user is not authenticated
/// - Access to the Key Vault is denied
/// - The API request fails
/// - The format is invalid
pub async fn export_secrets(
    vault_name: &str,
    vault_uri: &str,
    options: ExportOptions,
) -> Result<String, String> {
    export_secrets_internal(vault_name, vault_uri, options)
        .await
        .map_err(|e| {
            error!("Failed to export secrets: {}", e);
            e.to_string()
        })
}

async fn export_secrets_internal(
    vault_name: &str,
    vault_uri: &str,
    options: ExportOptions,
) -> Result<String> {
    info!("Exporting secrets in '{}' format", options.format);

    // Get all secrets metadata from cache or load
    let uri = vault_uri.to_string();
    let secrets = AZURE_CACHE
        .get_secrets_list_or_load(vault_uri, || async move { get_secrets(&uri).await })
        .await
        .map_err(|e| anyhow::anyhow!(e))?;

    // Fetch secret values if needed
    let mut secrets_with_values: Vec<(String, Option<String>, Secret)> = Vec::new();

    for secret in secrets {
        let name = extract_secret_name(&secret.id);
        let value = if options.include_value {
            // Try to get from cache first, then load if not cached
            let uri = vault_uri.to_string();
            let secret_name = name.clone();
            match AZURE_CACHE
                .get_secret_value_or_load(vault_uri, &name, || async move {
                    get_secret(&uri, &secret_name, None).await
                })
                .await
            {
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
        "full" => export_full_format(vault_name, vault_uri, &secrets_with_values, &options)?,
        "simple" => export_simple_format(&secrets_with_values)?,
        "keyValue" => export_key_value_format(&secrets_with_values)?,
        "dotenv" => export_dotenv_format(&secrets_with_values),
        _ => return Err(anyhow::anyhow!("Unknown export format: {}", options.format)),
    };

    info!(
        "Successfully exported {} secrets",
        secrets_with_values.len()
    );
    Ok(output)
}

/// Extract secret name from ID (last segment of the path)
fn extract_secret_name(id: &str) -> String {
    id.split('/').last().unwrap_or("").to_string()
}

/// Export secrets in full format (JSON with all metadata)
fn export_full_format(
    vault_name: &str,
    vault_uri: &str,
    secrets_with_values: &[(String, Option<String>, Secret)],
    options: &ExportOptions,
) -> Result<String> {
    let exported_secrets: Vec<ExportedSecret> = secrets_with_values
        .iter()
        .map(|(name, value, secret)| {
            let attrs = if options.include_enabled
                || options.include_created
                || options.include_updated
                || options.include_recovery_level
            {
                Some(ExportedAttributes {
                    enabled: if options.include_enabled {
                        Some(secret.attributes.enabled)
                    } else {
                        None
                    },
                    created: if options.include_created {
                        Some(format_timestamp(secret.attributes.created))
                    } else {
                        None
                    },
                    updated: if options.include_updated {
                        Some(format_timestamp(secret.attributes.updated))
                    } else {
                        None
                    },
                    recovery_level: if options.include_recovery_level {
                        Some(secret.attributes.recovery_level.clone())
                    } else {
                        None
                    },
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
        vault_name: vault_name.to_string(),
        vault_uri: vault_uri.to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        secrets: exported_secrets,
    };

    serde_json::to_string_pretty(&export).context("Failed to serialize full export")
}

/// Export secrets in simple format (JSON with name and value)
fn export_simple_format(
    secrets_with_values: &[(String, Option<String>, Secret)],
) -> Result<String> {
    let simple_secrets: Vec<SimpleSecret> = secrets_with_values
        .iter()
        .map(|(name, value, _)| SimpleSecret {
            name: name.clone(),
            value: value.clone().unwrap_or_default(),
        })
        .collect();

    let export = SimpleExport {
        secrets: simple_secrets,
    };

    serde_json::to_string_pretty(&export).context("Failed to serialize simple export")
}

/// Export secrets in key-value format (flat JSON object)
fn export_key_value_format(
    secrets_with_values: &[(String, Option<String>, Secret)],
) -> Result<String> {
    let kv: HashMap<String, String> = secrets_with_values
        .iter()
        .map(|(name, value, _)| (name.clone(), value.clone().unwrap_or_default()))
        .collect();

    serde_json::to_string_pretty(&kv).context("Failed to serialize key-value export")
}

/// Export secrets in dotenv format (.env file format)
fn export_dotenv_format(secrets_with_values: &[(String, Option<String>, Secret)]) -> String {
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

/// Format a Unix timestamp as an RFC3339 string
fn format_timestamp(timestamp: u64) -> String {
    use chrono::{DateTime, Utc};
    DateTime::<Utc>::from_timestamp(timestamp as i64, 0)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| timestamp.to_string())
}
