use serde::{Deserialize, Serialize};
use crate::azure::auth::types::AzureListResponse;

pub type KeyVaultListResponse = AzureListResponse<KeyVault>;

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
    pub access_policies: Vec<AccessPolicy>,
    pub create_mode: Option<String>, // 'recover' or 'default'
    pub enable_purge_protection: Option<bool>,
    pub enable_rbac_authorization: bool,
    pub enable_soft_delete: bool,
    pub enabled_for_deployment: bool,
    pub enabled_for_disk_encryption: Option<bool>,
    pub enabled_for_template_deployment: Option<bool>,
    pub hsm_pool_resource_id: Option<String>,
    pub network_acls: Option<NetworkRuleSet>,
    pub private_endpoint_connections: Option<Vec<PrivateEndpointConnectionItem>>,
    pub provisioning_state: String, // 'Succeeded' or 'RegisteringDns'
    pub public_network_access: String,
    pub sku: Sku,
    pub soft_delete_retention_in_days: Option<u8>, // max 90
    pub tenant_id: String,
    pub vault_uri: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyVaultAccessCheck {
    pub vault_uri: String,
    pub has_access: bool,
    pub can_list_secrets: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVaultRequest {
    pub(crate) location: String,
    pub properties: Properties
}


#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkRuleSet { // TODO@JOREN: these are not strings, see docs
    // https://learn.microsoft.com/en-us/rest/api/keyvault/keyvault/vaults/create-or-update?view=rest-keyvault-keyvault-2024-11-01&tabs=HTTP#networkruleset
    pub bypass: String,
    pub default_action: String,
    pub ip_rules: Vec<IpRule>,
    pub virtual_network_rules: Vec<VirtualNetworkRule>,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VirtualNetworkRule {
    pub id: String,
    pub ignore_missing_vnet_service_endpoint: Option<bool>,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpRule {
    pub value: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivateEndpointConnectionItem {
    pub etag: String,
    pub id: String,
    // TODO@JOREN: there is more but docs are unclear
}

