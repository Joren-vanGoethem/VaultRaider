use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::azure::keyvault::types::KeyVault;

lazy_static::lazy_static! {
    /// Stores the authenticated credential for making Azure API calls
    pub static ref KEYVAULT_STORE: Arc<Mutex<KeyvaultStore>> =
        Arc::new(Mutex::new(KeyvaultStore::new()));
}

type SubscriptionId = String; // type alias for convenience

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyvaultStore {
    pub vaults_by_subscription: HashMap<SubscriptionId, Vec<KeyVault>>,
}

impl KeyvaultStore {
    pub fn new() -> Self {
        KeyvaultStore {
            vaults_by_subscription: HashMap::new(),
        }
    }

    pub fn add_vault(&mut self, subscription_id: SubscriptionId, vault: KeyVault) {
        self.vaults_by_subscription
          .entry(subscription_id)
          .or_default()
          .push(vault);
    }

    pub fn add_vaults(&mut self, subscription_id: SubscriptionId, vaults: Vec<KeyVault>) {
        self.vaults_by_subscription
          .entry(subscription_id)
          .or_default()
          .extend(vaults);
    }

    pub fn get_vaults(&self, subscription_id: &str) -> Option<&[KeyVault]> {
        self.vaults_by_subscription
          .get(subscription_id)
          .map(Vec::as_slice)
    }

    pub fn clear_vaults(&mut self) {
        self.vaults_by_subscription.clear();
    }

    pub fn clear_vault(&mut self, subscription_id: &str) {
        self.vaults_by_subscription.remove(subscription_id);
    }
}
