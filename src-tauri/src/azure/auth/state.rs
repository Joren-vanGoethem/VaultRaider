// ============================================================================
// Global State
// ============================================================================

use crate::azure::auth::types::DeviceCodeState;
use azure_core::credentials::TokenCredential;
use std::sync::Arc;
use tokio::sync::Mutex;

lazy_static::lazy_static! {
    /// Stores the authenticated credential for making Azure API calls
    pub static ref AUTH_CREDENTIAL: Arc<Mutex<Option<Arc<dyn TokenCredential>>>> =
        Arc::new(Mutex::new(None));

    /// Stores device code state during authentication flow
    pub static ref DEVICE_CODE_STATE: Arc<Mutex<Option<DeviceCodeState>>> =
        Arc::new(Mutex::new(None));
}
