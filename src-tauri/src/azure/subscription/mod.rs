//! Azure Subscription module
//!
//! This module provides types and services for working with Azure subscriptions.

pub mod service;
pub mod types;

pub use service::get_subscriptions;
pub use types::Subscription;
