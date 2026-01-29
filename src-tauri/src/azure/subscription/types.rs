//! Types for Azure Subscriptions

use serde::{Deserialize, Serialize};

/// Azure Subscription information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub id: String,
    pub authorization_source: String,
    pub managed_by_tenants: Vec<Tenant>,
    pub subscription_id: String,
    pub tenant_id: String,
    pub display_name: String,
    pub state: String,
    pub subscription_policies: SubscriptionPolicy,
    pub tags: Option<serde_json::Value>,
}

/// Azure AD Tenant reference
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tenant {
    pub tenant_id: String,
}

/// Azure subscription list response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionListResponse {
    pub value: Vec<Subscription>,
    pub next_link: Option<String>,
}

/// Subscription policy information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionPolicy {
    pub location_placement_id: String,
    pub quota_id: String,
    pub spending_limit: String,
}
