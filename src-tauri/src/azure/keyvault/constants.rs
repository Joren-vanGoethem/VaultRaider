pub const TOKEN_URI: &str = "https://management.azure.com/.default";
pub const KEYVAULT_TOKEN_SCOPE: &str = "https://vault.azure.net/.default";

pub fn get_keyvault_uri(subscription_id: &str) -> String {
    format!("https://management.azure.com/subscriptions/{}/providers/Microsoft.KeyVault/vaults?api-version=2025-05-01", subscription_id)
}