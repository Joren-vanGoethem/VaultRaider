//! Azure Resource Group module
//!
//! This module provides functionality for working with Azure Resource Groups.

pub mod service;
pub mod types;

pub(crate) mod constants;

// Re-export for backwards compatibility
#[deprecated(note = "Use azure::resource_group::service module instead")]
pub mod client {
    
}
