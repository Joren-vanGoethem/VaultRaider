//! Token provider trait and implementations for Azure authentication
//!
//! This module defines a trait for abstracting token retrieval, allowing
//! for different authentication methods and easier testing.

use async_trait::async_trait;
use azure_core::credentials::TokenCredential;
use log::{debug, error, info};
use std::sync::Arc;

use crate::azure::http::AzureHttpError;

// ============================================================================
// Token Scopes
// ============================================================================

/// Azure Resource Management API scope
pub const MANAGEMENT_SCOPE: &str = "https://management.azure.com/.default";

/// Azure Key Vault data plane API scope
pub const KEYVAULT_SCOPE: &str = "https://vault.azure.net/.default";

// ============================================================================
// TokenProvider Trait
// ============================================================================

/// Trait for abstracting Azure token retrieval.
///
/// This trait allows for different token providers (cached credentials,
/// service principals, managed identities, etc.) to be used interchangeably.
///
/// # Example
///
/// ```rust,ignore
/// use crate::azure::auth::provider::{TokenProvider, CredentialTokenProvider};
///
/// async fn do_something(provider: &dyn TokenProvider) -> Result<(), AzureHttpError> {
///     let token = provider.get_management_token().await?;
///     // Use token...
///     Ok(())
/// }
/// ```
#[async_trait]
pub trait TokenProvider: Send + Sync {
    /// Get a token for the Azure Resource Management API.
    ///
    /// This token is used for ARM operations like listing subscriptions,
    /// resource groups, and Key Vault management plane operations.
    async fn get_management_token(&self) -> Result<String, AzureHttpError>;

    /// Get a token for the Azure Key Vault data plane API.
    ///
    /// This token is used for Key Vault data operations like reading
    /// and writing secrets, keys, and certificates.
    async fn get_keyvault_token(&self) -> Result<String, AzureHttpError>;

    /// Get a token for a specific scope.
    ///
    /// # Arguments
    ///
    /// * `scope` - The OAuth2 scope to request (e.g., "https://graph.microsoft.com/.default")
    async fn get_token_for_scope(&self, scope: &str) -> Result<String, AzureHttpError>;

    /// Check if the provider has valid credentials.
    async fn is_authenticated(&self) -> bool;
}

// ============================================================================
// Credential-based Token Provider
// ============================================================================

/// A token provider backed by an Azure SDK credential.
///
/// This is the primary implementation used in production, wrapping
/// the Azure SDK's `TokenCredential` trait.
pub struct CredentialTokenProvider {
    credential: Arc<dyn TokenCredential>,
}

impl CredentialTokenProvider {
    /// Create a new token provider from an Azure SDK credential.
    ///
    /// # Arguments
    ///
    /// * `credential` - An Azure SDK credential (e.g., from CLI, device code, etc.)
    pub fn new(credential: Arc<dyn TokenCredential>) -> Self {
        Self { credential }
    }

    /// Get the underlying credential.
    ///
    /// Useful when you need to pass the credential to Azure SDK clients.
    pub fn credential(&self) -> Arc<dyn TokenCredential> {
        Arc::clone(&self.credential)
    }
}

#[async_trait]
impl TokenProvider for CredentialTokenProvider {
    async fn get_management_token(&self) -> Result<String, AzureHttpError> {
        self.get_token_for_scope(MANAGEMENT_SCOPE).await
    }

    async fn get_keyvault_token(&self) -> Result<String, AzureHttpError> {
        self.get_token_for_scope(KEYVAULT_SCOPE).await
    }

    async fn get_token_for_scope(&self, scope: &str) -> Result<String, AzureHttpError> {
        debug!("Requesting token for scope {}", scope);

        let token_response = self
            .credential
            .get_token(&[scope], None)
            .await
            .map_err(|e| {
                error!("Failed to get token for scope {}, error: {}", scope, e);
                AzureHttpError::TokenError(format!(
                    "Failed to get token for scope {}: {}",
                    scope, e
                ))
            })?;

        info!("Successfully obtained token for scope {}", scope);
        Ok(token_response.token.secret().to_string())
    }

    async fn is_authenticated(&self) -> bool {
        // Try to get a token to verify credentials are still valid
        self.get_management_token().await.is_ok()
    }
}

// ============================================================================
// Global Token Provider (backed by AUTH_CREDENTIAL state)
// ============================================================================

use crate::azure::auth::state::AUTH_CREDENTIAL;

/// A token provider that uses the global AUTH_CREDENTIAL state.
///
/// This is a convenience wrapper for the existing global state pattern,
/// allowing gradual migration to the trait-based approach.
pub struct GlobalTokenProvider;

impl GlobalTokenProvider {
    /// Create a new global token provider.
    pub fn new() -> Self {
        Self
    }
}

impl Default for GlobalTokenProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl TokenProvider for GlobalTokenProvider {
    async fn get_management_token(&self) -> Result<String, AzureHttpError> {
        self.get_token_for_scope(MANAGEMENT_SCOPE).await
    }

    async fn get_keyvault_token(&self) -> Result<String, AzureHttpError> {
        self.get_token_for_scope(KEYVAULT_SCOPE).await
    }

    // #[instrument(
    //     name = "token.get_for_scope",
    //     skip(self),
    //     fields(scope = %scope)
    // )]
    async fn get_token_for_scope(&self, scope: &str) -> Result<String, AzureHttpError> {
        debug!("Requesting token from global state");

        let credential = {
            let cred_lock = AUTH_CREDENTIAL.lock().await;
            cred_lock.clone().ok_or_else(|| {
                error!("Not authenticated - no credential in global state");
                AzureHttpError::NotAuthenticated
            })?
        };

        let token_response = credential.get_token(&[scope], None).await.map_err(|e| {
            error!("Failed to get token: {}", e);
            AzureHttpError::TokenError(format!("Failed to get token for scope {}: {}", scope, e))
        })?;

        info!("Successfully obtained token");
        Ok(token_response.token.secret().to_string())
    }

    async fn is_authenticated(&self) -> bool {
        let cred_lock = AUTH_CREDENTIAL.lock().await;
        cred_lock.is_some()
    }
}

// ============================================================================
// Convenience Functions (backwards compatible)
// ============================================================================

/// Get the default global token provider.
///
/// This is a convenience function for getting a boxed token provider
/// backed by the global AUTH_CREDENTIAL state.
pub fn global_provider() -> Box<dyn TokenProvider> {
    Box::new(GlobalTokenProvider::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_global_provider_creation() {
        let _provider = GlobalTokenProvider::new();
        let _provider_default = GlobalTokenProvider::default();
    }

    #[test]
    fn test_scopes_are_correct() {
        assert_eq!(MANAGEMENT_SCOPE, "https://management.azure.com/.default");
        assert_eq!(KEYVAULT_SCOPE, "https://vault.azure.net/.default");
    }
}
