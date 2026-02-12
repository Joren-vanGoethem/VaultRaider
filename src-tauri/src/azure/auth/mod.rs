//! Azure Authentication module
//!
//! This module provides authentication functionality for Azure services,
//! supporting multiple authentication methods:
//! - Azure CLI credentials
//! - Service Principal via environment variables  
//! - Device Code Flow
//! - Interactive Browser Flow
pub mod interactive;
pub mod provider;
pub mod service;
pub mod token;
pub mod types;

pub(crate) mod cli;
pub(crate) mod constants;
pub(crate) mod service_principal;
pub(crate) mod state;
pub(crate) mod user_info;
