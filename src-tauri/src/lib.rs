mod azure_auth;

use crate::azure_auth::auth::{get_user_info, is_authenticated, login, logout};
use crate::azure_auth::device_code::*;
use crate::azure_auth::interactive_browser::{complete_interactive_browser_login, start_interactive_browser_login};
use crate::azure_auth::types::{AuthResult, DeviceCodeInfo};

#[derive(serde::Serialize)]
struct UserInfo {
    email: String,
    name: Option<String>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

/// Tauri command to start Azure login (tries Azure CLI first, then Device Code Flow)
#[tauri::command]
async fn azure_login() -> Result<AuthResult, String> {
    login().await
}

/// Tauri command to explicitly start device code flow
#[tauri::command]
async fn start_device_code() -> Result<DeviceCodeInfo, String> {
    start_device_code_login().await
}

/// Tauri command to complete device code authentication
#[tauri::command]
async fn complete_device_code() -> Result<AuthResult, String> {
    complete_device_code_login().await
}

/// Tauri command to start interactive browser authentication (RECOMMENDED - no secret needed!)
#[tauri::command]
async fn start_browser_login() -> Result<DeviceCodeInfo, String> {
    start_interactive_browser_login().await
}

/// Tauri command to complete browser authentication with authorization code
#[tauri::command]
async fn complete_browser_login(auth_code: String, state: String) -> Result<AuthResult, String> {
    complete_interactive_browser_login(auth_code, state).await
}

/// Tauri command to check authentication status
#[tauri::command]
async fn check_auth() -> bool {
    is_authenticated().await
}

/// Tauri command to get current user info
#[tauri::command]
async fn get_current_user() -> Option<UserInfo> {
    get_user_info().await.map(|(email, name)| UserInfo { email, name })
}

/// Tauri command to logout
#[tauri::command]
async fn azure_logout() -> Result<String, String> {
    logout().await;
    Ok("Logged out successfully".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            azure_login,
            start_device_code,
            complete_device_code,
            start_browser_login,
            complete_browser_login,
            check_auth,
            get_current_user,
            azure_logout
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
