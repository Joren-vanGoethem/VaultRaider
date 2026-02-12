//! Types for Azure Resource Groups

use serde::{Deserialize, Serialize};
/// Azure Resource Group
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

/// Resource Group tags
#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tags {}

/// Resource Group properties
#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Properties {
    pub provisioning_state: String,
}
