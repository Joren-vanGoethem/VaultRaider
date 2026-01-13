use azure_core::credentials::{Secret, TokenCredential};
use azure_identity::{
    AzureCliCredential, AzureCliCredentialOptions,
    ClientSecretCredential, ClientSecretCredentialOptions,
};
use base64::engine::general_purpose::{STANDARD as BASE64, URL_SAFE_NO_PAD};
use base64::Engine;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::env;
use std::sync::Arc;
use tokio::sync::Mutex;

// Azure configuration
const CLIENT_ID: &str = "d904e24e-ef24-4c0c-b361-597ec4ef69cf"; // Replace with your App Registration Client ID
const TENANT_ID: &str = "8948bc3d-2462-4abf-b447-84b07161f34e"; // Replace with your Tenant ID

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCodeInfo {
  pub user_code: String,
  pub device_code: String,
  pub verification_uri: String,
  pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResult {
  pub success: bool,
  pub message: String,
  pub user_email: Option<String>,
  pub user_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TokenClaims {
  #[serde(default)]
  upn: Option<String>, // User Principal Name (email)
  #[serde(default)]
  email: Option<String>,
  #[serde(default)]
  unique_name: Option<String>,
  #[serde(default)]
  name: Option<String>,
  #[serde(default)]
  preferred_username: Option<String>,
}

// Global state to hold the credential and user info
lazy_static::lazy_static! {
    pub static ref AUTH_CREDENTIAL: Arc<Mutex<Option<Arc<dyn TokenCredential>>>> =
        Arc::new(Mutex::new(None));
    pub static ref USER_INFO: Arc<Mutex<Option<(String, Option<String>)>>> =
        Arc::new(Mutex::new(None)); // (email, name)
    pub static ref PKCE_STATE: Arc<Mutex<Option<PKCEState>>> =
        Arc::new(Mutex::new(None));
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct PKCEState {
  code_verifier: String,
  code_challenge: String,
  state: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct TokenResponse {
  access_token: String,
  token_type: String,
  expires_in: u64,
  #[serde(default)]
  refresh_token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DeviceCodeResponse {
  device_code: String,
  user_code: String,
  verification_uri: String,
  #[allow(dead_code)]
  expires_in: u64,
  interval: u64,
  message: String,
}

/// Decode JWT token without verification to extract user info
fn extract_user_info_from_token(token: &str) -> Result<(Option<String>, Option<String>), String> {
  // Split the JWT token (format: header.payload.signature)
  let parts: Vec<&str> = token.split('.').collect();
  if parts.len() != 3 {
    return Err("Invalid token format".to_string());
  }

  // Decode the payload (second part)
  let payload = parts[1];

  // JWT uses base64url encoding, need to handle padding
  let padding_needed = (4 - payload.len() % 4) % 4;
  let padded_payload = format!("{}{}", payload, "=".repeat(padding_needed));

  let decoded = BASE64.decode(padded_payload.as_bytes())
    .map_err(|e| format!("Failed to decode token: {}", e))?;

  let claims: TokenClaims = serde_json::from_slice(&decoded)
    .map_err(|e| format!("Failed to parse token claims: {}", e))?;

  // Try to get email from various possible fields
  let email = claims.upn
    .or(claims.email)
    .or(claims.unique_name)
    .or(claims.preferred_username);

  let name = claims.name;

  Ok((email, name))
}

/// Generate a random code verifier for PKCE
#[allow(dead_code)]
fn generate_code_verifier() -> String {
  use rand::Rng;
  const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let mut rng = rand::thread_rng();
  (0..128)
    .map(|_| CHARSET[rng.gen_range(0..CHARSET.len())] as char)
    .collect()
}

/// Generate code challenge from verifier using SHA256
#[allow(dead_code)]
fn generate_code_challenge(verifier: &str) -> String {
  let mut hasher = Sha256::new();
  hasher.update(verifier.as_bytes());
  let hash = hasher.finalize();
  URL_SAFE_NO_PAD.encode(hash)
}

/// Generate a random state parameter
#[allow(dead_code)]
fn generate_state() -> String {
  use rand::Rng;
  const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let mut rng = rand::thread_rng();
  (0..32)
    .map(|_| CHARSET[rng.gen_range(0..CHARSET.len())] as char)
    .collect()
}

/// Start device code authentication flow (NO CLIENT SECRET NEEDED!)
/// This is the recommended approach for desktop applications
pub async fn start_interactive_browser_login() -> Result<DeviceCodeInfo, String> {
  // Request a device code from Azure
  let device_code_url = format!(
    "https://login.microsoftonline.com/{}/oauth2/v2.0/devicecode",
    TENANT_ID
  );

  let scope = "https://vault.azure.net/.default offline_access openid profile email";

  let mut params = HashMap::new();
  params.insert("client_id", CLIENT_ID);
  params.insert("scope", scope);

  let client = reqwest::Client::new();
  let response = client
    .post(&device_code_url)
    .form(&params)
    .send()
    .await
    .map_err(|e| format!("Failed to request device code: {}", e))?;

  if !response.status().is_success() {
    let error_text = response.text().await.unwrap_or_default();
    return Err(format!("Device code request failed: {}", error_text));
  }

  let device_response: DeviceCodeResponse = response
    .json()
    .await
    .map_err(|e| format!("Failed to parse device code response: {}", e))?;

  // Store the device code for polling
  let pkce_state = PKCEState {
    code_verifier: device_response.device_code.clone(),
    code_challenge: format!("{}", device_response.interval),
    state: device_response.user_code.clone(),
  };

  let mut state_guard = PKCE_STATE.lock().await;
  *state_guard = Some(pkce_state);
  drop(state_guard);

  Ok(DeviceCodeInfo {
    user_code: device_response.user_code,
    device_code: device_response.device_code,
    verification_uri: device_response.verification_uri,
    message: device_response.message,
  })
}

/// Complete device code authentication by polling for token
/// Call this after user has entered the code on the verification URL
#[allow(unused_variables)]
pub async fn complete_interactive_browser_login(auth_code: String, state: String) -> Result<AuthResult, String> {
  // Get the stored device code
  let state_guard = PKCE_STATE.lock().await;
  let pkce_state = state_guard.as_ref()
    .ok_or("No device code found. Please start the login flow first.")?;

  let device_code = pkce_state.code_verifier.clone();
  let interval = pkce_state.code_challenge.parse::<u64>().unwrap_or(5);
  drop(state_guard);

  // Poll the token endpoint
  let token_url = format!(
    "https://login.microsoftonline.com/{}/oauth2/v2.0/token",
    TENANT_ID
  );

  let mut params = HashMap::new();
  params.insert("client_id", CLIENT_ID);
  params.insert("grant_type", "urn:ietf:params:oauth:grant-type:device_code");
  params.insert("device_code", &device_code);

  let client = reqwest::Client::new();

  // Poll for up to 5 minutes
  for _ in 0..60 {
    let response = client
      .post(&token_url)
      .form(&params)
      .send()
      .await
      .map_err(|e| format!("Token request failed: {}", e))?;

    if response.status().is_success() {
      let token_response: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

      // Extract user info from access token
      let (user_email, user_name) = extract_user_info_from_token(&token_response.access_token)
        .unwrap_or((None, None));

      // For now, we can't store this as a TokenCredential because we'd need to implement
      // the trait properly. But we can store the token and use it directly.
      // TODO: Implement proper TokenCredential wrapper

      // Store user info
      if let Some(ref email) = user_email {
        let mut user_info = USER_INFO.lock().await;
        *user_info = Some((email.clone(), user_name.clone()));
      }

      // Clear PKCE state
      let mut state_guard = PKCE_STATE.lock().await;
      *state_guard = None;

      return Ok(AuthResult {
        success: true,
        message: "Successfully authenticated with device code!".to_string(),
        user_email,
        user_name,
      });
    }

    // Check error response
    let error_text = response.text().await.unwrap_or_default();

    if error_text.contains("authorization_pending") {
      // User hasn't completed authentication yet, keep polling
      tokio::time::sleep(tokio::time::Duration::from_secs(interval)).await;
      continue;
    } else if error_text.contains("slow_down") {
      // Slow down polling
      tokio::time::sleep(tokio::time::Duration::from_secs(interval + 5)).await;
      continue;
    } else {
      // Other error
      return Err(format!("Authentication failed: {}", error_text));
    }
  }

  Err("Authentication timed out. Please try again.".to_string())
}

/// Initiates Azure authentication using Azure CLI
/// Note: This requires the user to be logged in via Azure CLI (az login)
async fn try_azure_cli_login() -> Result<AuthResult, String> {
  // Create Azure CLI credential with tenant ID
  let mut options = AzureCliCredentialOptions::default();
  options.tenant_id = Some(TENANT_ID.to_string());

  let credential = AzureCliCredential::new(Some(options))
    .map_err(|e| format!("Failed to create Azure CLI credential: {}", e))?;

  // Try to get a token to verify authentication
  let scopes = &["https://vault.azure.net/.default"];
  match credential.get_token(scopes, None).await {
    Ok(token) => {
      // Extract user info from token
      let (user_email, user_name) = extract_user_info_from_token(token.token.secret())
        .unwrap_or((None, None));

      // Store the credential for future use
      let mut cred = AUTH_CREDENTIAL.lock().await;
      *cred = Some(credential);

      // Store user info
      if let Some(ref email) = user_email {
        let mut user_info = USER_INFO.lock().await;
        *user_info = Some((email.clone(), user_name.clone()));
      }

      Ok(AuthResult {
        success: true,
        message: "Successfully authenticated with Azure CLI!".to_string(),
        user_email,
        user_name,
      })
    }
    Err(e) => {
      Err(format!("Azure CLI authentication failed: {}", e))
    }
  }
}

/// Initiates Azure authentication using environment variables
/// This tries to authenticate using AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID
/// environment variables (Service Principal authentication)
async fn try_environment_credential() -> Result<AuthResult, String> {
  // Check if environment variables are set
  let client_id = env::var("AZURE_CLIENT_ID")
    .or_else(|_| Ok::<String, std::env::VarError>(CLIENT_ID.to_string()))
    .map_err(|e| format!("AZURE_CLIENT_ID not set: {}", e))?;

  let client_secret = env::var("AZURE_CLIENT_SECRET")
    .map_err(|_| "AZURE_CLIENT_SECRET environment variable not set".to_string())?;

  let tenant_id = env::var("AZURE_TENANT_ID")
    .or_else(|_| Ok::<String, std::env::VarError>(TENANT_ID.to_string()))
    .map_err(|e| format!("AZURE_TENANT_ID not set: {}", e))?;

  let options = ClientSecretCredentialOptions::default();

  let credential = ClientSecretCredential::new(
    &client_id,
    tenant_id,
    Secret::new(client_secret),
    Some(options)
  ).map_err(|e| format!("Failed to create client secret credential: {}", e))?;

  // Try to get a token to verify authentication
  let scopes = &["https://vault.azure.net/.default"];
  match credential.get_token(scopes, None).await {
    Ok(token) => {
      // Extract user info from token
      let (user_email, user_name) = extract_user_info_from_token(token.token.secret())
        .unwrap_or((None, None));

      // Store the credential for future use
      let mut cred = AUTH_CREDENTIAL.lock().await;
      *cred = Some(credential);

      // Store user info
      if let Some(ref email) = user_email {
        let mut user_info = USER_INFO.lock().await;
        *user_info = Some((email.clone(), user_name.clone()));
      }

      Ok(AuthResult {
        success: true,
        message: "Successfully authenticated using Service Principal!".to_string(),
        user_email,
        user_name,
      })
    }
    Err(e) => {
      Err(format!("Service Principal authentication failed: {}", e))
    }
  }
}

/// Initiates Azure authentication using an environment-based approach
/// This provides instructions for setting up alternative authentication
pub async fn start_device_code_login() -> Result<DeviceCodeInfo, String> {
  // Provide instructions for alternative authentication methods
  Ok(DeviceCodeInfo {
    user_code: "N/A".to_string(),
    device_code: "N/A".to_string(),
    verification_uri: "https://portal.azure.com".to_string(),
    message: "Alternative authentication methods:\n1. Azure CLI: Run 'az login' in your terminal\n2. Service Principal: Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID environment variables\n\nThen click Login again.".to_string(),
  })
}

/// Complete the authentication flow
/// This tries environment-based authentication (Service Principal)
pub async fn complete_device_code_login() -> Result<AuthResult, String> {
  try_environment_credential().await
}

/// Try to authenticate with the best available method
/// First tries Azure CLI, then falls back to environment-based authentication (Service Principal)
pub async fn login() -> Result<AuthResult, String> {
  // First, try Azure CLI authentication
  match try_azure_cli_login().await {
    Ok(result) => {
      println!("Successfully authenticated with Azure CLI");
      return Ok(result);
    }
    Err(cli_error) => {
      println!("Azure CLI authentication failed: {}", cli_error);
      println!("Falling back to Service Principal authentication...");

      // Fall back to Service Principal authentication via environment variables
      match try_environment_credential().await {
        Ok(result) => Ok(result),
        Err(env_error) => {
          Err(format!(
            "All authentication methods failed.\n\nAzure CLI: {}\n\nService Principal: {}\n\nPlease either:\n1. Run 'az login' in your terminal, or\n2. Set AZURE_CLIENT_SECRET environment variable for Service Principal auth",
            cli_error, env_error
          ))
        }
      }
    }
  }
}

/// Check if user is currently authenticated
pub async fn is_authenticated() -> bool {
  let cred = AUTH_CREDENTIAL.lock().await;
  cred.is_some()
}

/// Logout and clear credentials
pub async fn logout() {
  let mut cred = AUTH_CREDENTIAL.lock().await;
  *cred = None;

  let mut user_info = USER_INFO.lock().await;
  *user_info = None;
}

/// Get current user info
pub async fn get_user_info() -> Option<(String, Option<String>)> {
  let user_info = USER_INFO.lock().await;
  user_info.clone()
}

