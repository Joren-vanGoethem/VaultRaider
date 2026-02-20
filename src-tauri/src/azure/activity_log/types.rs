//! Types for Azure Activity Log (audit log) entries
//!
//! These types match the Azure Monitor Activity Log REST API response format.
//! API Reference: https://learn.microsoft.com/en-us/rest/api/monitor/activity-logs/list

use serde::{Deserialize, Serialize};

/// A single activity log event from Azure Monitor.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityLogEvent {
    /// The authorization information for the event.
    pub authorization: Option<Authorization>,

    /// The resource Id of the event source.
    pub resource_id: Option<String>,

    /// The resource type of the event source.
    pub resource_type: Option<LocalizableString>,

    /// The operation that was performed.
    pub operation_name: Option<LocalizableString>,

    /// The category of the event.
    pub category: Option<LocalizableString>,

    /// The event level (Critical, Error, Warning, Informational, Verbose).
    pub level: Option<String>,

    /// The result type of the operation (Succeeded, Failed, Start, Accept, etc.).
    pub result_type: Option<String>,

    /// A property bag describing the operation's result in detail.
    pub result_signature: Option<String>,

    /// The event timestamp (ISO 8601).
    pub event_timestamp: Option<String>,

    /// The submission timestamp (ISO 8601).
    pub submission_timestamp: Option<String>,

    /// The caller (user or service principal) who initiated the operation.
    pub caller: Option<String>,

    /// The correlation ID for grouping related events.
    pub correlation_id: Option<String>,

    /// The operation ID.
    pub operation_id: Option<String>,

    /// A description of the event.
    pub description: Option<String>,

    /// The event data ID.
    pub event_data_id: Option<String>,

    /// Status of the event (e.g., Succeeded, Failed).
    pub status: Option<LocalizableString>,

    /// Sub-status of the event.
    pub sub_status: Option<LocalizableString>,

    /// Claims associated with the event.
    pub claims: Option<serde_json::Value>,

    /// HTTP request info associated with the event.
    pub http_request: Option<HttpRequestInfo>,

    /// Additional properties of the event.
    pub properties: Option<serde_json::Value>,

    /// The subscription ID.
    pub subscription_id: Option<String>,

    /// The tenant ID.
    pub tenant_id: Option<String>,

    /// Resource group name.
    pub resource_group_name: Option<String>,

    /// The resource provider name.
    pub resource_provider_name: Option<LocalizableString>,
}

/// Authorization details for an activity log event.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Authorization {
    /// The action that was authorized.
    pub action: Option<String>,
    /// The scope of the authorization.
    pub scope: Option<String>,
    /// The role definition.
    pub role: Option<String>,
}

/// A localizable string used by Azure Monitor API responses.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalizableString {
    /// The invariant value.
    pub value: Option<String>,
    /// The locale-specific display value.
    pub localized_value: Option<String>,
}

/// HTTP request information associated with an activity log event.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpRequestInfo {
    /// The client request ID.
    pub client_request_id: Option<String>,
    /// The client IP address.
    pub client_ip_address: Option<String>,
    /// The HTTP method.
    pub method: Option<String>,
    /// The request URI.
    pub uri: Option<String>,
}
