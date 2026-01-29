//! Azure SDK integration modules
//!
//! This module contains all Azure-related functionality organized by service.

pub(crate) mod auth;
pub(crate) mod http;
pub(crate) mod keyvault;
pub(crate) mod resource_group;
pub(crate) mod subscription;

// Keep old module for backwards compatibility during migration
#[deprecated(note = "Use azure::subscription module instead")]
pub(crate) mod subscriptions {
    pub use super::subscription::service::get_subscriptions;
    pub use super::subscription::types::Subscription;
}
