pub fn get_secrets_uri(keyvault_uri: &str) -> String {
    // Remove https:// prefix and trailing slash if present
    let clean_uri = keyvault_uri
        .trim_start_matches("https://")
        .trim_end_matches('/');
    format!("https://{}/secrets?api-version=2025-07-01", clean_uri)
}

pub fn get_secret_version_uri(keyvault_uri: &str, secret_name: &str, secret_version: Option<&str>) -> String {
    // Remove https:// prefix and trailing slash if present
    let clean_uri = keyvault_uri
      .trim_start_matches("https://")
      .trim_end_matches('/');
    
    if secret_version.is_none()  {
        format!("https://{}/secrets/{}?api-version=2025-07-01", clean_uri, secret_name)
    } else {
        format!("https://{}/secrets/{}/{}?api-version=2025-07-01", clean_uri, secret_name, secret_version.unwrap_or("latest"))
    }
}

pub fn delete_secret_uri(keyvault_uri: &str, secret_name: &str) -> String {
    // Remove https:// prefix and trailing slash if present
    let clean_uri = keyvault_uri
      .trim_start_matches("https://")
      .trim_end_matches('/');

    format!("https://{}/secrets/{}?api-version=2025-07-01", clean_uri, secret_name)
}

pub fn create_secret_uri(keyvault_uri: &str, secret_name: &str) -> String {
    // Remove https:// prefix and trailing slash if present
    let clean_uri = keyvault_uri
      .trim_start_matches("https://")
      .trim_end_matches('/');

    format!("https://{}/secrets/{}?api-version=2025-07-01", clean_uri, secret_name)
}

pub fn update_secret_uri(keyvault_uri: &str, secret_name: &str) -> String {
    // Remove https:// prefix and trailing slash if present
    let clean_uri = keyvault_uri
      .trim_start_matches("https://")
      .trim_end_matches('/');

    format!("https://{}/secrets/{}?api-version=2025-07-01", clean_uri, secret_name)
}



