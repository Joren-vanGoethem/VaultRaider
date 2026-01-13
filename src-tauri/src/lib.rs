mod azure_auth;

use azure_auth::{AuthResult, start_device_code_login, is_authenticated, logout, get_user_info};

#[derive(serde::Serialize)]
struct UserInfo {
    email: String,
    name: Option<String>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Tauri command to start Azure login
#[tauri::command]
async fn azure_login() -> Result<AuthResult, String> {
    start_device_code_login().await
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
            greet,
            azure_login,
            check_auth,
            get_current_user,
            azure_logout
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
