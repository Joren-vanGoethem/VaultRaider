//! Key Vault Secrets module
//!
//! This module provides functionality for working with Key Vault secrets.

pub mod export;
pub mod service;
pub mod types;

pub(crate) mod constants;

// Re-export for backwards compatibility
#[deprecated(note = "Use azure::keyvault::secret::service module instead")]
pub mod client {
    pub use super::service::{create_secret, delete_secret, get_secret, get_secrets, update_secret};
}
