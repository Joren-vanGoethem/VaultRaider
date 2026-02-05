//! Centralized configuration and constants for VaultRaider
//!
//! This module contains all configuration values, API endpoints,
//! and constants used throughout the application.

// ============================================================================
// Azure App Registration
// ============================================================================

/// Azure AD App Registration Client ID
pub const CLIENT_ID: &str = "d904e24e-ef24-4c0c-b361-597ec4ef69cf";

/// Azure AD Tenant ID
pub const TENANT_ID: &str = "8948bc3d-2462-4abf-b447-84b07161f34e";

// ============================================================================
// OAuth2 Scopes
// ============================================================================

/// Azure Resource Management API scope
pub const MANAGEMENT_SCOPE: &str = "https://management.azure.com/.default";

/// Azure Key Vault data plane API scope
pub const KEYVAULT_SCOPE: &str = "https://vault.azure.net/.default";

/// Combined auth scopes for interactive login
pub const AUTH_SCOPES: &str = "https://management.azure.com/.default offline_access openid profile email";

// ============================================================================
// Azure AD Endpoints
// ============================================================================

/// Azure AD device code endpoint base URL
pub const DEVICE_CODE_ENDPOINT: &str = "https://login.microsoftonline.com";

/// Azure AD token endpoint base URL
pub const TOKEN_ENDPOINT: &str = "https://login.microsoftonline.com";

// ============================================================================
// Polling Configuration
// ============================================================================

/// Maximum number of polling attempts for device code flow
pub const MAX_POLL_ATTEMPTS: u32 = 60;

/// Seconds to wait between poll attempts when rate limited
pub const POLL_SLOWDOWN_SECONDS: u64 = 5;

// ============================================================================
// API Versions
// ============================================================================

/// Azure Resource Manager API version
pub const ARM_API_VERSION: &str = "2022-12-01";

/// Azure Key Vault Management API version
pub const KEYVAULT_MGMT_API_VERSION: &str = "2024-11-01";

/// Azure Key Vault Data Plane API version
pub const KEYVAULT_DATA_API_VERSION: &str = "2025-07-01";

/// Azure Resource Groups API version
pub const RESOURCE_GROUPS_API_VERSION: &str = "2021-04-01";

// ============================================================================
// URL Builders
// ============================================================================

pub mod urls {
    use super::*;

    /// Get the URL to list all subscriptions
    pub fn subscriptions() -> String {
        format!(
            "https://management.azure.com/subscriptions?api-version={}",
            ARM_API_VERSION
        )
    }

    /// Get the URL to list all subscriptions
    pub fn subscription(subscription_id: &str) -> String {
        format!(
            "https://management.azure.com/subscriptions/{subscription_id}?api-version={}",
            ARM_API_VERSION
        )
    }

    /// Get the URL to list all Key Vaults in a subscription
    pub fn keyvaults(subscription_id: &str) -> String {
        format!(
            "https://management.azure.com/subscriptions/{}/providers/Microsoft.KeyVault/vaults?api-version={}",
            subscription_id, KEYVAULT_MGMT_API_VERSION
        )
    }

    /// Get the URL to create/update a Key Vault
    pub fn keyvault(subscription_id: &str, resource_group: &str, keyvault_name: &str) -> String {
        format!(
            "https://management.azure.com/subscriptions/{}/resourceGroups/{}/providers/Microsoft.KeyVault/vaults/{}?api-version={}",
            subscription_id, resource_group, keyvault_name, KEYVAULT_MGMT_API_VERSION
        )
    }

    /// Get the URL to list all resource groups in a subscription
    pub fn resource_groups(subscription_id: &str) -> String {
        format!(
            "https://management.azure.com/subscriptions/{}/resourcegroups?api-version={}",
            subscription_id, RESOURCE_GROUPS_API_VERSION
        )
    }

    /// Get the URL to get a specific resource group
    pub fn resource_group(subscription_id: &str, resource_group_name: &str) -> String {
        format!(
            "https://management.azure.com/subscriptions/{}/resourcegroups/{}?api-version={}",
            subscription_id, resource_group_name, RESOURCE_GROUPS_API_VERSION
        )
    }

    /// Get the URL to list all secrets in a Key Vault
    pub fn secrets(keyvault_uri: &str) -> String {
        let clean_uri = keyvault_uri
            .trim_start_matches("https://")
            .trim_end_matches('/');
        format!(
            "https://{}/secrets?api-version={}",
            clean_uri, KEYVAULT_DATA_API_VERSION
        )
    }

    /// Get the URL to get a specific secret (optionally with version)
    pub fn secret(keyvault_uri: &str, secret_name: &str, secret_version: Option<&str>) -> String {
        let clean_uri = keyvault_uri
            .trim_start_matches("https://")
            .trim_end_matches('/');

        match secret_version {
            Some(version) => format!(
                "https://{}/secrets/{}/{}?api-version={}",
                clean_uri, secret_name, version, KEYVAULT_DATA_API_VERSION
            ),
            None => format!(
                "https://{}/secrets/{}?api-version={}",
                clean_uri, secret_name, KEYVAULT_DATA_API_VERSION
            ),
        }
    }

    /// Get the URL to create/update a secret
    pub fn create_secret(keyvault_uri: &str, secret_name: &str) -> String {
        let clean_uri = keyvault_uri
            .trim_start_matches("https://")
            .trim_end_matches('/');
        format!(
            "https://{}/secrets/{}?api-version={}",
            clean_uri, secret_name, KEYVAULT_DATA_API_VERSION
        )
    }

    /// Get the URL to delete a secret
    pub fn delete_secret(keyvault_uri: &str, secret_name: &str) -> String {
        let clean_uri = keyvault_uri
            .trim_start_matches("https://")
            .trim_end_matches('/');
        format!(
            "https://{}/secrets/{}?api-version={}",
            clean_uri, secret_name, KEYVAULT_DATA_API_VERSION
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subscriptions_url() {
        let url = urls::subscriptions();
        assert!(url.contains("management.azure.com"));
        assert!(url.contains("subscriptions"));
    }

    #[test]
    fn test_keyvaults_url() {
        let url = urls::keyvaults("sub-123");
        assert!(url.contains("sub-123"));
        assert!(url.contains("Microsoft.KeyVault/vaults"));
    }

    #[test]
    fn test_secrets_url() {
        let url = urls::secrets("https://myvault.vault.azure.net/");
        assert_eq!(
            url,
            format!("https://myvault.vault.azure.net/secrets?api-version={}", KEYVAULT_DATA_API_VERSION)
        );
    }

    #[test]
    fn test_secret_with_version() {
        let url = urls::secret("https://myvault.vault.azure.net", "mysecret", Some("v1"));
        assert!(url.contains("mysecret/v1"));
    }

    #[test]
    fn test_secret_without_version() {
        let url = urls::secret("https://myvault.vault.azure.net", "mysecret", None);
        assert!(url.contains("mysecret?api-version"));
        assert!(!url.contains("mysecret/"));
    }
}
