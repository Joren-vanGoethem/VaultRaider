//! Azure Key Vault module
//!
//! This module provides functionality for working with Azure Key Vault,
//! including vault management and secret operations.

pub mod service;
pub mod types;
pub mod secret;

pub(crate) mod constants;

// Re-export for backwards compatibility
#[deprecated(note = "Use azure::keyvault::service module instead")]
pub mod client {
    pub use super::service::{check_keyvault_access, create_keyvault, get_keyvaults};
}
