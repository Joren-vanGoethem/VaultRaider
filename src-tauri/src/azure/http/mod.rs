//! Azure HTTP client utilities
//!
//! This module provides a reusable HTTP client wrapper for making
//! authenticated requests to Azure APIs.

mod client;
mod error;

pub use client::AzureHttpClient;
pub use error::AzureHttpError;
