//! Key Vault Secrets module
//!
//! This module provides functionality for working with Key Vault secrets.

pub mod export;
pub mod import;
pub mod service;
pub mod types;

pub(crate) mod constants;

// Re-export for backwards compatibility
#[deprecated(note = "Use azure::keyvault::secret::service module instead")]
pub mod client {
    
}
