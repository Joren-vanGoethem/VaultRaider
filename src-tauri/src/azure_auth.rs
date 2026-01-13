use azure_core::credentials::{Secret, TokenCredential};
use azure_identity::{
    AzureCliCredential, AzureCliCredentialOptions,
    ClientSecretCredential, ClientSecretCredentialOptions,
};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::sync::Arc;
use tokio::sync::Mutex;

// ============================================================================
// Constants
// ============================================================================

// Azure configuration
const CLIENT_ID: &str = "d904e24e-ef24-4c0c-b361-597ec4ef69cf"; // Replace with your App Registration Client ID
const TENANT_ID: &str = "8948bc3d-2462-4abf-b447-84b07161f34e"; // Replace with your Tenant ID

// Azure endpoints
const DEVICE_CODE_ENDPOINT: &str = "https://login.microsoftonline.com";
const TOKEN_ENDPOINT: &str = "https://login.microsoftonline.com";
const VAULT_SCOPE: &str = "https://vault.azure.net/.default";
const AUTH_SCOPES: &str = "https://vault.azure.net/.default offline_access openid profile email";

// Polling configuration
const MAX_POLL_ATTEMPTS: u32 = 60;
const POLL_SLOWDOWN_SECONDS: u64 = 5;

// ============================================================================
// Type Aliases
// ============================================================================

/// User information: (email, optional display name)
pub type UserInfo = (String, Option<String>);

// ============================================================================
// Public Data Structures
// ============================================================================

/// Information returned when initiating device code authentication flow
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCodeInfo {
    pub user_code: String,
    pub device_code: String,
    pub verification_uri: String,
    pub message: String,
}

/// Result of an authentication attempt
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResult {
    pub success: bool,
    pub message: String,
    pub user_email: Option<String>,
    pub user_name: Option<String>,
}

// ============================================================================
// Internal Data Structures
// ============================================================================

/// JWT token claims for extracting user information
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

/// State for device code authentication flow
#[derive(Debug, Clone)]
struct DeviceCodeState {
    device_code: String,
    interval: u64,
}

/// Response from Azure token endpoint
#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    #[allow(dead_code)]
    token_type: String,
    #[allow(dead_code)]
    expires_in: u64,
    #[serde(default)]
    refresh_token: Option<String>,
}

/// Response from Azure device code endpoint
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

// ============================================================================
// Global State
// ============================================================================

lazy_static::lazy_static! {
    /// Stores the authenticated credential for making Azure API calls
    static ref AUTH_CREDENTIAL: Arc<Mutex<Option<Arc<dyn TokenCredential>>>> =
        Arc::new(Mutex::new(None));

    /// Stores authenticated user information (email, display name)
    static ref USER_INFO: Arc<Mutex<Option<UserInfo>>> =
        Arc::new(Mutex::new(None));

    /// Stores device code state during authentication flow
    static ref DEVICE_CODE_STATE: Arc<Mutex<Option<DeviceCodeState>>> =
        Arc::new(Mutex::new(None));
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Stores user information in global state
async fn store_user_info(email: Option<String>, name: Option<String>) {
    if let Some(email) = email {
        let mut user_info = USER_INFO.lock().await;
        *user_info = Some((email, name));
    }
}

/// Extracts user info from token and stores credential
async fn store_auth_result(
    credential: Arc<dyn TokenCredential>,
    token_secret: &str,
    auth_method: &str,
) -> Result<AuthResult, String> {
    let (user_email, user_name) = extract_user_info_from_token(token_secret)
        .unwrap_or((None, None));

    // Store the credential
    let mut cred = AUTH_CREDENTIAL.lock().await;
    *cred = Some(credential);

    // Store user info
    store_user_info(user_email.clone(), user_name.clone()).await;

    Ok(AuthResult {
        success: true,
        message: format!("Successfully authenticated with {}!", auth_method),
        user_email,
        user_name,
    })
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

    let decoded = BASE64
        .decode(padded_payload.as_bytes())
        .map_err(|e| format!("Failed to decode token: {}", e))?;

    let claims: TokenClaims = serde_json::from_slice(&decoded)
        .map_err(|e| format!("Failed to parse token claims: {}", e))?;

    // Try to get email from various possible fields (ordered by preference)
    let email = claims
        .upn
        .or(claims.email)
        .or(claims.unique_name)
        .or(claims.preferred_username);

    Ok((email, claims.name))
}

// ============================================================================
// Authentication Methods
// ============================================================================

/// Start device code authentication flow
/// This is the recommended approach for desktop applications (no client secret needed)
pub async fn start_interactive_browser_login() -> Result<DeviceCodeInfo, String> {
    let device_code_url = format!(
        "{}/{}/oauth2/v2.0/devicecode",
        DEVICE_CODE_ENDPOINT, TENANT_ID
    );

    let mut params = HashMap::new();
    params.insert("client_id", CLIENT_ID);
    params.insert("scope", AUTH_SCOPES);

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

    // Store the device code and polling interval for later use
    let state = DeviceCodeState {
        device_code: device_response.device_code.clone(),
        interval: device_response.interval,
    };

    let mut state_guard = DEVICE_CODE_STATE.lock().await;
    *state_guard = Some(state);

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
    // Retrieve the stored device code state
    let state_guard = DEVICE_CODE_STATE.lock().await;
    let device_state = state_guard.as_ref()
        .ok_or("No device code found. Please start the login flow first.")?;

    let device_code = device_state.device_code.clone();
    let interval = device_state.interval;
    drop(state_guard);

    // Prepare token endpoint
    let token_url = format!(
        "{}/{}/oauth2/v2.0/token",
        TOKEN_ENDPOINT, TENANT_ID
    );

    let mut params = HashMap::new();
    params.insert("client_id", CLIENT_ID);
    params.insert("grant_type", "urn:ietf:params:oauth:grant-type:device_code");
    params.insert("device_code", &device_code);

    let client = reqwest::Client::new();

    // Poll for token (up to MAX_POLL_ATTEMPTS times)
    for _ in 0..MAX_POLL_ATTEMPTS {
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

            // Extract and store user info from access token
            let (user_email, user_name) = extract_user_info_from_token(&token_response.access_token)
                .unwrap_or((None, None));

            store_user_info(user_email.clone(), user_name.clone()).await;

            // Clear device code state after successful authentication
            let mut state_guard = DEVICE_CODE_STATE.lock().await;
            *state_guard = None;

            return Ok(AuthResult {
                success: true,
                message: "Successfully authenticated with device code!".to_string(),
                user_email,
                user_name,
            });
        }

        // Handle polling errors
        let error_text = response.text().await.unwrap_or_default();

        if error_text.contains("authorization_pending") {
            // User hasn't completed authentication yet, continue polling
            tokio::time::sleep(tokio::time::Duration::from_secs(interval)).await;
        } else if error_text.contains("slow_down") {
            // Azure requests slower polling
            tokio::time::sleep(tokio::time::Duration::from_secs(interval + POLL_SLOWDOWN_SECONDS)).await;
        } else {
            // Authentication failed with an error
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
    let scopes = &[VAULT_SCOPE];
    let token = credential
        .get_token(scopes, None)
        .await
        .map_err(|e| format!("Azure CLI authentication failed: {}", e))?;

    store_auth_result(credential, token.token.secret(), "Azure CLI").await
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
    let scopes = &[VAULT_SCOPE];
    let token = credential
        .get_token(scopes, None)
        .await
        .map_err(|e| format!("Service Principal authentication failed: {}", e))?;

    store_auth_result(credential, token.token.secret(), "Service Principal").await
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

