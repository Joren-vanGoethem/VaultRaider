pub const TOKEN_URI: &str = "https://management.azure.com/.default";

pub fn get_keyvault_uri(subscription_id: &str) -> String {
    format!("https://management.azure.com/subscriptions/{}/providers/Microsoft.KeyVault/vaults?api-version=2025-05-01", subscription_id)
}

pub fn get_secrets_uri(keyvault_uri: &str) -> String {
    format!("https://{}/secrets?api-version=2025-07-01", keyvault_uri)
}

