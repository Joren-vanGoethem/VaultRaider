use crate::azure::auth::types::AzureListResponse;
use serde::{Deserialize, Serialize};

pub type SecretListResponse = AzureListResponse<Secret>;
pub type DeletedSecretListResponse = AzureListResponse<DeletedSecretItem>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Secret {
    pub id: String,
    pub attributes: SecretAttributes,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretAttributes {
    pub enabled: bool,
    pub created: u64,
    pub updated: u64,
    pub recovery_level: String,
    pub recoverable_days: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretBundle {
    pub id: String,
    pub attributes: SecretAttributes,
    pub value: String,
}

/// A deleted secret item returned by the list deleted secrets API.
/// Contains the secret metadata plus deletion-specific fields.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletedSecretItem {
    pub id: String,
    pub attributes: SecretAttributes,
    pub recovery_id: Option<String>,
    pub deleted_date: Option<u64>,
    pub scheduled_purge_date: Option<u64>,
}

/// A deleted secret bundle returned when getting a specific deleted secret.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletedSecretBundle {
    pub id: String,
    pub attributes: SecretAttributes,
    pub value: Option<String>,
    pub recovery_id: Option<String>,
    pub deleted_date: Option<u64>,
    pub scheduled_purge_date: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyvaultError {
    pub error: KeyvaultErrorDetail,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyvaultErrorDetail {
    pub code: String,
    pub message: String,
}
