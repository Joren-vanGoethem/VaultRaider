// ============================================================================
// Constants
// ============================================================================

// Note: Azure Client ID and Tenant ID are stored in user_config.rs
// and can be configured by the user at runtime.

// Azure endpoints
pub const DEVICE_CODE_ENDPOINT: &str = "https://login.microsoftonline.com";
pub const TOKEN_ENDPOINT: &str = "https://login.microsoftonline.com";

// Token scopes for API calls
pub const VAULT_SCOPE: &str = "https://vault.azure.net/.default";
pub const ARM_SCOPE: &str = "https://management.azure.com/.default";

/// Auth scopes for interactive login - includes Azure Management for direct access
pub const AUTH_SCOPES: &str = "https://management.azure.com/.default offline_access openid profile";

// Polling configuration
pub const MAX_POLL_ATTEMPTS: u32 = 60;
pub const POLL_SLOWDOWN_SECONDS: u64 = 5;
