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
pub async fn store_user_info(email: Option<String>, name: Option<String>) {
    let mut user_info = USER_INFO.lock().await;

    if let Some(email) = email {
        info!("Storing user info: email={}, name={:?}", email, name);
        *user_info = Some((email, name));
    } else {
        info!("No user email available from token");
    }
}
