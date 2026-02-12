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

pub mod types;
pub mod constants;
mod disk_io;

use tokio::sync::RwLock;
use crate::user_config::constants::{MULTI_TENANT_ENDPOINT, USER_CONFIG, VAULTRAIDER_CLIENT_ID};
use crate::user_config::disk_io::{load_config_from_disk, save_config_to_disk};
use crate::user_config::types::UserConfig;


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
