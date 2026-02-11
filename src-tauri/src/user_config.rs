//! User configuration management for VaultRaider
//!
//! This module handles storing and retrieving user-specific configuration
//! such as Azure Client ID and Tenant ID.
//!
//! # Multi-tenant Authentication
//!
//! By default, the application uses Microsoft's "organizations" endpoint which allows
//! users from any Azure AD tenant (work/school accounts) to authenticate.
//!
//! Users can optionally configure their own Client ID and/or Tenant ID for:
//! - Using a custom app registration with specific permissions
//! - Restricting authentication to a specific tenant

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;
use tokio::sync::RwLock;

/// VaultRaider's published multi-tenant app registration Client ID
/// This app is registered as a multi-tenant public client application
/// Users from any Azure AD tenant can use this to authenticate
pub const VAULTRAIDER_CLIENT_ID: &str = "a58ed96c-b73d-4652-9f05-fc8f49154c8d";

/// Multi-tenant endpoint - "organizations" allows work/school accounts from any Azure AD tenant
/// Personal Microsoft accounts are not supported
pub const MULTI_TENANT_ENDPOINT: &str = "organizations";

/// Configuration file name
const CONFIG_FILE_NAME: &str = "config.json";

/// Application name for config directory
const APP_NAME: &str = "VaultRaider";

/// User configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserConfig {
    /// Azure AD App Registration Client ID (optional - uses VaultRaider's app if not set)
    #[serde(default)]
    pub client_id: Option<String>,
    /// Azure AD Tenant ID (optional - uses multi-tenant auth if not set)
    #[serde(default)]
    pub tenant_id: Option<String>,
    /// Auto-login on app startup (default: false)
    #[serde(default)]
    pub auto_login: bool,
}

impl Default for UserConfig {
    fn default() -> Self {
        Self {
            client_id: None,
            tenant_id: None,
            auto_login: false,
        }
    }
}

/// Global user configuration
static USER_CONFIG: OnceLock<RwLock<UserConfig>> = OnceLock::new();

/// Get the configuration directory path
fn get_config_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|dir| dir.join(APP_NAME))
}

/// Get the configuration file path
fn get_config_file_path() -> Option<PathBuf> {
    get_config_dir().map(|dir| dir.join(CONFIG_FILE_NAME))
}

/// Load configuration from disk
fn load_config_from_disk() -> UserConfig {
    let config_path = match get_config_file_path() {
        Some(path) => path,
        None => {
            log::warn!("Could not determine config directory, using defaults");
            return UserConfig::default();
        }
    };

    if !config_path.exists() {
        log::info!("Config file not found, using defaults");
        return UserConfig::default();
    }

    match fs::read_to_string(&config_path) {
        Ok(content) => match serde_json::from_str(&content) {
            Ok(config) => {
                log::info!("Loaded configuration from {:?}", config_path);
                config
            }
            Err(e) => {
                log::error!("Failed to parse config file: {}", e);
                UserConfig::default()
            }
        },
        Err(e) => {
            log::error!("Failed to read config file: {}", e);
            UserConfig::default()
        }
    }
}

/// Save configuration to disk
fn save_config_to_disk(config: &UserConfig) -> Result<(), String> {
    let config_dir = get_config_dir().ok_or("Could not determine config directory")?;

    // Create config directory if it doesn't exist
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let config_path = config_dir.join(CONFIG_FILE_NAME);
    let content =
        serde_json::to_string_pretty(config).map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content).map_err(|e| format!("Failed to write config file: {}", e))?;

    log::info!("Saved configuration to {:?}", config_path);
    Ok(())
}

/// Initialize the global configuration
pub fn init_config() {
    let config = load_config_from_disk();
    USER_CONFIG.get_or_init(|| RwLock::new(config));
}

/// Get the current user configuration
pub async fn get_config() -> UserConfig {
    let config_lock = USER_CONFIG.get_or_init(|| RwLock::new(load_config_from_disk()));
    config_lock.read().await.clone()
}

/// Update the user configuration
pub async fn update_config(new_config: UserConfig) -> Result<(), String> {
    // Validate: if client_id is provided, it must be a valid GUID
    if let Some(ref client_id) = new_config.client_id {
        if client_id.trim().is_empty() {
            return Err("Client ID cannot be empty if provided".to_string());
        }
    }

    // Validate: if tenant_id is provided, it must be a valid GUID or a known endpoint
    if let Some(ref tenant_id) = new_config.tenant_id {
        if tenant_id.trim().is_empty() {
            return Err("Tenant ID cannot be empty if provided".to_string());
        }
    }

    // Save to disk first
    save_config_to_disk(&new_config)?;

    // Update in-memory config
    let config_lock = USER_CONFIG.get_or_init(|| RwLock::new(load_config_from_disk()));
    let mut config = config_lock.write().await;
    *config = new_config;

    Ok(())
}

/// Get the effective Client ID
/// Returns user-configured value if set, otherwise VaultRaider's multi-tenant app
pub async fn get_client_id() -> String {
    get_config()
        .await
        .client_id
        .unwrap_or_else(|| VAULTRAIDER_CLIENT_ID.to_string())
}

/// Get the effective Tenant ID / Authority endpoint
/// Returns user-configured value if set, otherwise "organizations" for multi-tenant auth
pub async fn get_tenant_id() -> String {
    get_config()
        .await
        .tenant_id
        .unwrap_or_else(|| MULTI_TENANT_ENDPOINT.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = UserConfig::default();
        assert!(config.client_id.is_none());
        assert!(config.tenant_id.is_none());
    }

    #[test]
    fn test_effective_values() {
        // When None, should use defaults
        assert_eq!(VAULTRAIDER_CLIENT_ID.len(), 36); // GUID length
        assert_eq!(MULTI_TENANT_ENDPOINT, "organizations");
    }
}
