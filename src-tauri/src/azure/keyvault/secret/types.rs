use serde::{Deserialize, Serialize};
use crate::azure::auth::types::AzureListResponse;

pub type SecretListResponse = AzureListResponse<Secret>;

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


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletedSecretBundle {
  pub id: String,
  pub attributes: SecretAttributes,
  pub value: String,
  pub scheduled_purge_date: u64,
  pub recovery_id: u64,
}