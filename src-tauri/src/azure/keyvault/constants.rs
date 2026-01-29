pub const MANAGEMENT_TOKEN_SCOPE: &str = "https://management.azure.com/.default";
pub const KEYVAULT_TOKEN_SCOPE: &str = "https://vault.azure.net/.default";

pub fn get_keyvault_uri(subscription_id: &str) -> String {
    format!(
        "https://management.azure.com/subscriptions/{}/providers/Microsoft.KeyVault/vaults?api-version=2025-05-01", subscription_id
    )
}

pub fn create_keyvault_uri(subscription_id: &str, resource_group: &str, keyvault_name: &str) -> String {
    format!(
        "https://management.azure.com/subscriptions/{}/resourceGroups/{}/providers/Microsoft.KeyVault/vaults/{}?api-version=2024-11-01",
        subscription_id, resource_group, keyvault_name)
}