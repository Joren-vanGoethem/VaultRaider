// ============================================================================
// Constants
// ============================================================================

// Azure configuration
pub const CLIENT_ID: &str = "d904e24e-ef24-4c0c-b361-597ec4ef69cf"; // Replace with your App Registration Client ID
pub const TENANT_ID: &str = "8948bc3d-2462-4abf-b447-84b07161f34e"; // Replace with your Tenant ID

// Azure endpoints
pub const DEVICE_CODE_ENDPOINT: &str = "https://login.microsoftonline.com";
pub const TOKEN_ENDPOINT: &str = "https://login.microsoftonline.com";
pub const VAULT_SCOPE: &str = "https://vault.azure.net/.default";
pub const ARM_SCOPE: &str = "https://management.azure.com/.default";
pub const AUTH_SCOPES: &str =
    "https://management.azure.com/.default offline_access openid profile email";

// Polling configuration
pub const MAX_POLL_ATTEMPTS: u32 = 60;
pub const POLL_SLOWDOWN_SECONDS: u64 = 5;
