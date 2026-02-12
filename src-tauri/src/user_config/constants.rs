use std::sync::OnceLock;
use tokio::sync::RwLock;
use crate::user_config::types::UserConfig;

/// VaultRaider's published multi-tenant app registration Client ID
/// This app is registered as a multi-tenant public client application
/// Users from any Azure AD tenant can use this to authenticate
pub const VAULTRAIDER_CLIENT_ID: &str = "a58ed96c-b73d-4652-9f05-fc8f49154c8d";

/// Multi-tenant endpoint - "organizations" allows work/school accounts from any Azure AD tenant
/// Personal Microsoft accounts are not supported
pub const MULTI_TENANT_ENDPOINT: &str = "organizations";

/// Configuration file name
pub const CONFIG_FILE_NAME: &str = "config.json";

/// Application name for config directory
pub const APP_NAME: &str = "VaultRaider";

/// Global user configuration
pub static USER_CONFIG: OnceLock<RwLock<UserConfig>> = OnceLock::new();
