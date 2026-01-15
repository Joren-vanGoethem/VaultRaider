use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyVaultListResponse {
    pub value: Vec<KeyVault>,
    pub next_link: Option<String>
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyVault {
    pub id: String,
    pub name: String,
    pub r#type: String,
    pub location: String,
    pub tags: Tags,
    pub system_data: SystemData,
    pub properties: Properties,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tags {}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemData {
    pub last_modified_by: String, // User identity, maybe when we fetch these we can use this id to get more info about who did what
    pub last_modified_by_type: String,
    pub last_modified_at: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Properties {
    pub sku: Sku,
    pub tenant_id: String,
    pub access_policies: Vec<AccessPolicy>,
    pub enabled_for_deployment: bool,
    pub enabled_for_disk_encryption: Option<bool>,
    pub enabled_for_template_deployment: Option<bool>,
    pub enable_soft_delete: bool,
    pub soft_delete_retention_in_days: Option<u32>,
    pub enable_rbac_authorization: bool,
    pub enable_purge_protection: Option<bool>,
    pub vault_uri: String,
    pub provisioning_state: String,
    pub public_network_access: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sku {
    pub family: String,
    pub name: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessPolicy {
    pub tenant_id: String,
    pub object_id: String,
    pub permissions: Permissions,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Permissions {
    pub keys: Option<Vec<String>>,
    pub secrets: Vec<String>,
    pub certificates: Option<Vec<String>>,
    pub storage: Option<Vec<String>>,
}
