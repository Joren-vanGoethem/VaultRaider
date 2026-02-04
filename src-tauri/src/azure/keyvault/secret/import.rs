//! Secret import functionality - business logic for parsing and importing secrets from various formats

use anyhow::{Context, Result};
use log::{error, info, debug};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Parsed secret ready for import
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedSecret {
    pub name: String,
    pub value: String,
}

/// Full export format structure (for parsing)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FullExportFormat {
    #[serde(default)]
    vault_name: Option<String>,
    #[serde(default)]
    vault_uri: Option<String>,
    #[serde(default)]
    exported_at: Option<String>,
    secrets: Vec<FullExportSecret>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FullExportSecret {
    name: String,
    #[serde(default)]
    value: Option<String>,
}

/// Simple export format structure
#[derive(Debug, Clone, Deserialize)]
struct SimpleExportFormat {
    secrets: Vec<SimpleExportSecret>,
}

#[derive(Debug, Clone, Deserialize)]
struct SimpleExportSecret {
    name: String,
    value: String,
}

/// Parse an import file and extract secrets.
///
/// # Arguments
///
/// * `content` - The file content to parse
/// * `format` - Optional format hint. If None, will auto-detect.
///
/// # Returns
///
/// A vector of ImportedSecret ready for import.
///
/// # Errors
///
/// This function will return an error if:
/// - The content cannot be parsed in any known format
/// - The content is empty
/// - Required fields (name, value) are missing
pub fn parse_import_file(
    content: &str,
    format: Option<&str>,
) -> Result<Vec<ImportedSecret>, String> {
    parse_import_file_internal(content, format)
        .map_err(|e| {
            error!("Failed to parse import file: {}", e);
            e.to_string()
        })
}

fn parse_import_file_internal(
    content: &str,
    format: Option<&str>,
) -> Result<Vec<ImportedSecret>> {
    let content = content.trim();

    if content.is_empty() {
        return Err(anyhow::anyhow!("File content is empty"));
    }

    match format {
        Some("full") => parse_full_format(content),
        Some("simple") => parse_simple_format(content),
        Some("keyValue") => parse_key_value_format(content),
        Some("dotenv") => parse_dotenv_format(content),
        Some(unknown) => Err(anyhow::anyhow!("Unknown format: {}", unknown)),
        None => auto_detect_and_parse(content),
    }
}

/// Auto-detect format and parse
fn auto_detect_and_parse(content: &str) -> Result<Vec<ImportedSecret>> {
    info!("Auto-detecting import format");

    // Try dotenv first (if it looks like it)
    if looks_like_dotenv(content) {
        debug!("Detected dotenv format");
        if let Ok(secrets) = parse_dotenv_format(content) {
            if !secrets.is_empty() {
                return Ok(secrets);
            }
        }
    }

    // Try JSON formats
    if content.starts_with('{') || content.starts_with('[') {
        // Try full format
        if let Ok(secrets) = parse_full_format(content) {
            debug!("Detected full export format");
            return Ok(secrets);
        }

        // Try simple format
        if let Ok(secrets) = parse_simple_format(content) {
            debug!("Detected simple export format");
            return Ok(secrets);
        }

        // Try key-value format
        if let Ok(secrets) = parse_key_value_format(content) {
            debug!("Detected key-value format");
            return Ok(secrets);
        }
    }

    // Last resort: try dotenv
    if let Ok(secrets) = parse_dotenv_format(content) {
        if !secrets.is_empty() {
            debug!("Parsed as dotenv format");
            return Ok(secrets);
        }
    }

    Err(anyhow::anyhow!("Could not detect file format. Supported formats: full JSON export, simple JSON, key-value JSON, or .env"))
}

/// Check if content looks like dotenv format
fn looks_like_dotenv(content: &str) -> bool {
    let lines: Vec<&str> = content.lines()
        .filter(|l| !l.trim().is_empty() && !l.trim().starts_with('#'))
        .collect();

    if lines.is_empty() {
        return false;
    }

    // Check if most lines contain '=' and don't start with '{'
    let matching = lines.iter()
        .filter(|l| l.contains('=') && !l.trim().starts_with('{'))
        .count();

    matching as f64 / lines.len() as f64 > 0.5
}

/// Parse full export format
fn parse_full_format(content: &str) -> Result<Vec<ImportedSecret>> {
    let export: FullExportFormat = serde_json::from_str(content)
        .context("Failed to parse as full export format")?;

    let secrets: Vec<ImportedSecret> = export.secrets
        .into_iter()
        .map(|s| ImportedSecret {
            name: s.name,
            value: s.value.unwrap_or_default(),
        })
        .collect();

    if secrets.is_empty() {
        return Err(anyhow::anyhow!("No secrets found in full export format"));
    }

    info!("Parsed {} secrets from full export format", secrets.len());
    Ok(secrets)
}

/// Parse simple export format
fn parse_simple_format(content: &str) -> Result<Vec<ImportedSecret>> {
    let export: SimpleExportFormat = serde_json::from_str(content)
        .context("Failed to parse as simple export format")?;

    let secrets: Vec<ImportedSecret> = export.secrets
        .into_iter()
        .map(|s| ImportedSecret {
            name: s.name,
            value: s.value,
        })
        .collect();

    if secrets.is_empty() {
        return Err(anyhow::anyhow!("No secrets found in simple export format"));
    }

    info!("Parsed {} secrets from simple export format", secrets.len());
    Ok(secrets)
}

/// Parse key-value format (flat JSON object)
fn parse_key_value_format(content: &str) -> Result<Vec<ImportedSecret>> {
    let kv: HashMap<String, serde_json::Value> = serde_json::from_str(content)
        .context("Failed to parse as key-value JSON")?;

    // Filter out non-string values and known metadata fields
    let secrets: Vec<ImportedSecret> = kv
        .into_iter()
        .filter(|(key, _)| {
            // Filter out known metadata fields from full export format
            !matches!(key.as_str(), "vaultName" | "vaultUri" | "exportedAt" | "secrets")
        })
        .filter_map(|(key, value)| {
            match value {
                serde_json::Value::String(s) => Some(ImportedSecret {
                    name: key,
                    value: s,
                }),
                serde_json::Value::Number(n) => Some(ImportedSecret {
                    name: key,
                    value: n.to_string(),
                }),
                serde_json::Value::Bool(b) => Some(ImportedSecret {
                    name: key,
                    value: b.to_string(),
                }),
                _ => None, // Skip arrays and objects
            }
        })
        .collect();

    if secrets.is_empty() {
        return Err(anyhow::anyhow!("No valid key-value pairs found"));
    }

    info!("Parsed {} secrets from key-value format", secrets.len());
    Ok(secrets)
}

/// Parse dotenv format
fn parse_dotenv_format(content: &str) -> Result<Vec<ImportedSecret>> {
    let mut secrets = Vec::new();

    for line in content.lines() {
        let line = line.trim();

        // Skip empty lines and comments
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // Parse KEY=value or KEY="value" format
        if let Some(eq_pos) = line.find('=') {
            let key = line[..eq_pos].trim();
            let mut value = line[eq_pos + 1..].trim();

            // Skip lines that don't look like env vars (e.g., JSON)
            if key.is_empty() || key.contains(' ') || key.contains('{') {
                continue;
            }

            // Remove surrounding quotes if present
            if (value.starts_with('"') && value.ends_with('"'))
                || (value.starts_with('\'') && value.ends_with('\'')) {
                value = &value[1..value.len() - 1];
            }

            // Convert env var format (UPPER_SNAKE_CASE) to kebab-case for secret names
            let name = key.to_lowercase().replace('_', "-");

            secrets.push(ImportedSecret {
                name,
                value: value.to_string(),
            });
        }
    }

    if secrets.is_empty() {
        return Err(anyhow::anyhow!("No valid environment variables found"));
    }

    info!("Parsed {} secrets from dotenv format", secrets.len());
    Ok(secrets)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_full_format() {
        let content = r#"{
            "vaultName": "test-vault",
            "vaultUri": "https://test-vault.vault.azure.net",
            "exportedAt": "2026-02-04T12:00:00Z",
            "secrets": [
                {"name": "secret1", "value": "value1"},
                {"name": "secret2", "value": "value2"}
            ]
        }"#;

        let result = parse_full_format(content).unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].name, "secret1");
        assert_eq!(result[0].value, "value1");
    }

    #[test]
    fn test_parse_simple_format() {
        let content = r#"{
            "secrets": [
                {"name": "secret1", "value": "value1"},
                {"name": "secret2", "value": "value2"}
            ]
        }"#;

        let result = parse_simple_format(content).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_parse_key_value_format() {
        let content = r#"{
            "my-secret": "secret-value",
            "another-secret": "another-value"
        }"#;

        let result = parse_key_value_format(content).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_parse_dotenv_format() {
        let content = r#"
# This is a comment
MY_SECRET="secret-value"
ANOTHER_SECRET=another-value
"#;

        let result = parse_dotenv_format(content).unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].name, "my-secret");
        assert_eq!(result[0].value, "secret-value");
    }

    #[test]
    fn test_auto_detect_dotenv() {
        let content = r#"
MY_SECRET="value1"
ANOTHER_SECRET=value2
"#;

        let result = auto_detect_and_parse(content).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_auto_detect_json() {
        let content = r#"{"key1": "value1", "key2": "value2"}"#;

        let result = auto_detect_and_parse(content).unwrap();
        assert_eq!(result.len(), 2);
    }
}
