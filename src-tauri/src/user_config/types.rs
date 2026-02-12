use serde::{Deserialize, Serialize};

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
