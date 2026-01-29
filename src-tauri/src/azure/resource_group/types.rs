use serde::{Deserialize, Serialize};
use crate::azure::auth::types::AzureListResponse;
use crate::azure::keyvault::types::{AccessPolicy, Sku};

pub type ResourceGroupListResponse = AzureListResponse<ResourceGroup>;

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceGroup {
  pub id: String,
  pub location: String,
  pub managed_by: Option<String>,
  pub name: String,
  pub properties: Properties,
  pub tags: Option<Tags>,
  pub r#type: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tags {}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Properties {
  pub provisioning_state: String
}