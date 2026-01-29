//! Azure Authentication module
//!
//! This module provides authentication functionality for Azure services,
//! supporting multiple authentication methods:
//! - Azure CLI credentials
//! - Service Principal via environment variables  
//! - Device Code Flow
//! - Interactive Browser Flow

pub mod service;
pub mod device_code;
pub mod interactive;
pub mod provider;
pub mod token;
pub mod types;

pub(crate) mod cli;
pub(crate) mod constants;
pub(crate) mod service_principal;
pub(crate) mod state;
pub(crate) mod user_info;

// Re-export old auth module for backwards compatibility
#[deprecated(note = "Use azure::auth::service module instead")]
pub mod auth {
    pub use super::service::{get_user_info, is_authenticated, login, logout};
}

// Re-export interactive_browser for backwards compatibility
#[deprecated(note = "Use azure::auth::interactive module instead")]
pub mod interactive_browser {
    pub use super::interactive::{
        complete_interactive_browser_login, start_interactive_browser_login,
    };
}
