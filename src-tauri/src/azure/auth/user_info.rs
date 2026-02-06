use crate::azure::auth::types::UserInfo;
use std::sync::Arc;
use tokio::sync::Mutex;

lazy_static::lazy_static! {
    /// Stores authenticated user information (email, display name)
    pub static ref USER_INFO: Arc<Mutex<Option<UserInfo>>> =
        Arc::new(Mutex::new(None));
}

/// Stores user information in global state
pub async fn store_user_info(email: Option<String>, name: Option<String>) {
    if let Some(email) = email {
        let mut user_info = USER_INFO.lock().await;
        *user_info = Some((email, name));
    }
}
