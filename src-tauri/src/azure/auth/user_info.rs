use crate::azure::auth::types::UserInfo;
use log::info;
use std::sync::Arc;
use tokio::sync::Mutex;

lazy_static::lazy_static! {
    /// Stores authenticated user information (email, display name)
    pub static ref USER_INFO: Arc<Mutex<Option<UserInfo>>> =
        Arc::new(Mutex::new(None));
}

/// Stores user information in global state
/// For personal Microsoft accounts, email may not be available from the token
pub async fn store_user_info(email: Option<String>, name: Option<String>) {
    let mut user_info = USER_INFO.lock().await;

    // Store user info if we have at least email or name
    if email.is_some() || name.is_some() {
        let display_email = email.clone().unwrap_or_else(|| "Personal Account".to_string());
        info!("Storing user info: email={:?}, name={:?}", email, name);
        *user_info = Some((display_email, name));
    } else {
        // For personal accounts where we can't extract info, use a placeholder
        info!("No user info available from token - using placeholder for personal account");
        *user_info = Some(("Microsoft Account".to_string(), Some("Personal Account".to_string())));
    }
}
