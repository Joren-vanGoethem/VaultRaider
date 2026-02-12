use std::fs;
use std::path::PathBuf;
use crate::user_config::constants::{APP_NAME, CONFIG_FILE_NAME};
use crate::user_config::types::UserConfig;

/// Get the configuration directory path
fn get_config_dir() -> Option<PathBuf> {
  dirs::config_dir().map(|dir| dir.join(APP_NAME))
}

/// Get the configuration file path
fn get_config_file_path() -> Option<PathBuf> {
  get_config_dir().map(|dir| dir.join(CONFIG_FILE_NAME))
}

/// Load configuration from disk
pub fn load_config_from_disk() -> UserConfig {
  let config_path = match get_config_file_path() {
    Some(path) => path,
    None => {
      log::warn!("Could not determine config directory, using defaults");
      return UserConfig::default();
    }
  };

  if !config_path.exists() {
    log::info!("Config file not found, using defaults");
    return UserConfig::default();
  }

  match fs::read_to_string(&config_path) {
    Ok(content) => match serde_json::from_str(&content) {
      Ok(config) => {
        log::info!("Loaded configuration from {:?}", config_path);
        config
      }
      Err(e) => {
        log::error!("Failed to parse config file: {}", e);
        UserConfig::default()
      }
    },
    Err(e) => {
      log::error!("Failed to read config file: {}", e);
      UserConfig::default()
    }
  }
}

/// Save configuration to disk
pub fn save_config_to_disk(config: &UserConfig) -> Result<(), String> {
  let config_dir = get_config_dir().ok_or("Could not determine config directory")?;

  // Create config directory if it doesn't exist
  if !config_dir.exists() {
    fs::create_dir_all(&config_dir)
      .map_err(|e| format!("Failed to create config directory: {}", e))?;
  }

  let config_path = config_dir.join(CONFIG_FILE_NAME);
  let content =
    serde_json::to_string_pretty(config).map_err(|e| format!("Failed to serialize config: {}", e))?;

  fs::write(&config_path, content).map_err(|e| format!("Failed to write config file: {}", e))?;

  log::info!("Saved configuration to {:?}", config_path);
  Ok(())
}
