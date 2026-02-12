//! Token provider trait and implementations for Azure authentication
//!
//! This module defines a trait for abstracting token retrieval, allowing
//! for different authentication methods and easier testing.

use async_trait::async_trait;
use log::{debug, error, info};

use crate::azure::http::AzureHttpError;

// ============================================================================
// Token Scopes
// ============================================================================

/// Azure Resource Management API scope
pub const MANAGEMENT_SCOPE: &str = "https://management.azure.com/.default";

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

    /// Get a token for a specific scope.
    ///
    /// # Arguments
    ///
    /// * `scope` - The OAuth2 scope to request (e.g., "https://graph.microsoft.com/.default")
    async fn get_token_for_scope(&self, scope: &str) -> Result<String, AzureHttpError>;
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
}

// ============================================================================
// Convenience Functions (backwards compatible)
// ============================================================================

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
    }
}
