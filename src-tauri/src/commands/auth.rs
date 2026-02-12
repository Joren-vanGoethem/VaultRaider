//! Authentication-related Tauri commands

use crate::azure::auth::interactive::{
    complete_interactive_browser_login, start_interactive_browser_login,
};
use crate::azure::auth::service::{get_user_info, is_authenticated, login, logout};
use crate::azure::auth::types::{AuthResult, DeviceCodeInfo};
use crate::cache::AZURE_CACHE;

/// User information returned to the frontend
#[derive(serde::Serialize)]
pub struct UserInfo {
    pub email: String,
    pub name: Option<String>,
}

/// Start Azure login (tries Azure CLI first, then Device Code Flow)
#[tauri::command]
pub async fn azure_login() -> Result<AuthResult, String> {
    login().await
}

/// Start interactive browser authentication (RECOMMENDED - no secret needed!)
#[tauri::command]
pub async fn start_browser_login() -> Result<DeviceCodeInfo, String> {
    start_interactive_browser_login().await
}

/// Complete browser authentication with authorization code
#[tauri::command]
pub async fn complete_browser_login(
    _auth_code: String,
    _state: String,
) -> Result<AuthResult, String> {
    complete_interactive_browser_login().await
}

/// Check authentication status
#[tauri::command]
pub async fn check_auth() -> bool {
    is_authenticated().await
}

/// Get current user info
#[tauri::command]
pub async fn get_current_user() -> Option<UserInfo> {
    get_user_info()
        .await
        .map(|(email, name)| UserInfo { email, name })
}

/// Logout from Azure
/// Clears all cached data
#[tauri::command]
pub async fn azure_logout() -> Result<String, String> {
    logout().await;
    // Clear all cached Azure data on logout
    AZURE_CACHE.clear_all().await;
    Ok("Logged out successfully".to_string())
}
