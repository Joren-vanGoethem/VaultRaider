// ============================================================================
// Type Aliases
// ============================================================================

use serde::{Deserialize, Serialize};

// TODO@JOREN: should we not use the struct in the lib file, or vice versa
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
pub struct TokenClaims {
    #[serde(default)]
    pub upn: Option<String>, // User Principal Name (email)
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub unique_name: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub preferred_username: Option<String>,
}

/// State for device code authentication flow
#[derive(Debug, Clone)]
pub struct DeviceCodeState {
    pub device_code: String,
    pub interval: u64,
}

/// Response from Azure token endpoint
#[derive(Debug, Deserialize)]
pub struct TokenResponse {
    pub(crate) access_token: String,
    #[allow(dead_code)]
    token_type: String,
    pub(crate) expires_in: Option<u64>,
    #[serde(default)]
    refresh_token: Option<String>,
}


/// Response from Azure device code endpoint
#[derive(Debug, Deserialize)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    #[allow(dead_code)]
    expires_in: u64,
    pub interval: u64,
    pub message: String,
}
