//! Azure HTTP client utilities
//!
//! This module provides a reusable HTTP client wrapper for making
//! authenticated requests to Azure APIs, including pagination support.

mod client;
mod error;
mod pagination;

pub use client::AzureHttpClient;
pub use error::AzureHttpError;
pub use pagination::{fetch_all_paginated, fetch_all_paginated_custom};
