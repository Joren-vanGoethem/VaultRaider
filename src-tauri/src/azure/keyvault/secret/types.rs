use serde::{Deserialize, Serialize};


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