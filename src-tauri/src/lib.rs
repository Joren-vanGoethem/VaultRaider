//! VaultRaider - Azure Key Vault Management Application
//!
//! This is the main library entry point for the Tauri application.

mod azure;
mod cache;
mod commands;
mod config;
mod user_config;

use commands::auth::{
  azure_login, azure_logout, check_auth, complete_browser_login,
  get_current_user, start_browser_login,
};
use commands::cache::{
  clear_cache, get_cache_stats, invalidate_keyvaults_cache, invalidate_resource_groups_cache,
  invalidate_subscriptions_cache, invalidate_vault_cache,
};
use commands::config::{get_azure_config, save_azure_config};
use commands::keyvault::{
  check_keyvault_access, create_keyvault, create_secret, delete_secret, export_secrets,
  fetch_keyvaults, get_secret, get_secret_versions, get_secrets, parse_import_file, update_secret,
};
use commands::resource_group::get_resource_groups;
use commands::subscription::fetch_subscriptions;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize user configuration
    user_config::init_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            azure_login,
            start_browser_login,
            complete_browser_login,
            check_auth,
            get_current_user,
            azure_logout,
            // Config commands
            get_azure_config,
            save_azure_config,
            // Subscription commands
            fetch_subscriptions,
            // Key Vault commands
            fetch_keyvaults,
            check_keyvault_access,
            create_keyvault,
            // Secret commands
            get_secrets,
            get_secret,
            get_secret_versions,
            delete_secret,
            create_secret,
            update_secret,
            export_secrets,
            parse_import_file,
            // Resource Group commands
            get_resource_groups,
            // Cache commands
            get_cache_stats,
            clear_cache,
            invalidate_subscriptions_cache,
            invalidate_keyvaults_cache,
            invalidate_resource_groups_cache,
            invalidate_vault_cache,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
