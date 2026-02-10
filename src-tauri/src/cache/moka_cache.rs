//! Moka-based caching for Azure API calls
//!
//! Provides high-performance caching with:
//! - TTL-based expiration
//! - Automatic loading on cache miss
//! - Thread-safe access
//! - Per-key eviction

use anyhow::{Context, Result};
use log::{debug, info};
use moka::future::Cache;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;

use crate::azure::keyvault::secret::types::{Secret, SecretBundle};
use crate::azure::keyvault::types::KeyVault;
use crate::azure::resource_group::types::ResourceGroup;
use crate::azure::subscription::types::Subscription;

/// Default TTL for subscriptions (10 minutes - they don't change often)
const SUBSCRIPTION_TTL_SECS: u64 = 600;

/// Default TTL for resource groups (5 minutes)
const RESOURCE_GROUP_TTL_SECS: u64 = 300;

/// Default TTL for keyvaults (5 minutes)
const KEYVAULT_TTL_SECS: u64 = 300;

/// Default TTL for secrets list (3 minutes)
const SECRETS_LIST_TTL_SECS: u64 = 180;

/// Default TTL for secret values (3 minutes)
const SECRET_VALUE_TTL_SECS: u64 = 180;

/// Maximum cache entries
const MAX_CACHE_ENTRIES: u64 = 25_000;

/// Wrapper to store Vec in cache (since Moka needs Clone)
#[derive(Clone, Debug)]
pub struct CachedVec<T: Clone>(pub Vec<T>);

impl<T: Clone> From<Vec<T>> for CachedVec<T> {
    fn from(v: Vec<T>) -> Self {
        CachedVec(v)
    }
}

impl<T: Clone> From<CachedVec<T>> for Vec<T> {
    fn from(cv: CachedVec<T>) -> Self {
        cv.0
    }
}

/// Global Azure cache manager using Moka
pub struct AzureCache {
    /// Cache for subscriptions (key: "subscriptions")
    subscriptions: Cache<String, CachedVec<Subscription>>,

    /// Cache for resource groups per subscription (key: subscription_id)
    resource_groups: Cache<String, CachedVec<ResourceGroup>>,

    /// Cache for keyvaults per subscription (key: subscription_id)
    keyvaults: Cache<String, CachedVec<KeyVault>>,

    /// Cache for secrets list per vault (key: vault_uri)
    secrets_list: Cache<String, CachedVec<Secret>>,

    /// Cache for secret values (key: "vault_uri::secret_name")
    secret_values: Cache<String, SecretBundle>,
}

impl AzureCache {
    /// Create a new cache instance with default TTLs
    pub fn new() -> Self {
        Self {
            subscriptions: Cache::builder()
                .max_capacity(100)
                .time_to_live(Duration::from_secs(SUBSCRIPTION_TTL_SECS))
                .build(),

            resource_groups: Cache::builder()
                .max_capacity(1_000)
                .time_to_live(Duration::from_secs(RESOURCE_GROUP_TTL_SECS))
                .build(),

            keyvaults: Cache::builder()
                .max_capacity(1_000)
                .time_to_live(Duration::from_secs(KEYVAULT_TTL_SECS))
                .build(),

            secrets_list: Cache::builder()
                .max_capacity(1_000)
                .time_to_live(Duration::from_secs(SECRETS_LIST_TTL_SECS))
                .build(),

            secret_values: Cache::builder()
                .max_capacity(MAX_CACHE_ENTRIES)
                .time_to_live(Duration::from_secs(SECRET_VALUE_TTL_SECS))
                .build(),
        }
    }

    /// Create cache with custom TTLs (in seconds)
    pub fn with_ttls(
        subscription_ttl: u64,
        resource_group_ttl: u64,
        keyvault_ttl: u64,
        secrets_list_ttl: u64,
        secret_value_ttl: u64,
    ) -> Self {
        Self {
            subscriptions: Cache::builder()
                .max_capacity(100)
                .time_to_live(Duration::from_secs(subscription_ttl))
                .build(),

            resource_groups: Cache::builder()
                .max_capacity(1_000)
                .time_to_live(Duration::from_secs(resource_group_ttl))
                .build(),

            keyvaults: Cache::builder()
                .max_capacity(1_000)
                .time_to_live(Duration::from_secs(keyvault_ttl))
                .build(),

            secrets_list: Cache::builder()
                .max_capacity(1_000)
                .time_to_live(Duration::from_secs(secrets_list_ttl))
                .build(),

            secret_values: Cache::builder()
                .max_capacity(MAX_CACHE_ENTRIES)
                .time_to_live(Duration::from_secs(secret_value_ttl))
                .build(),
        }
    }

    // ==================== Subscription ====================

    /// Get subscription from cache by id
    pub async fn get_subscription(&self, subscription_id: &str) -> Option<Subscription> {
        let result = self.subscriptions.get("subscriptions").await;
        if result.is_some() {
            debug!("Cache hit for subscription");
        }
        result.map(|v| {
            v.0.into_iter()
                .find(|s| s.subscription_id == subscription_id)
                .unwrap()
        })
    }

    /// Get subscription by id with automatic loading on cache miss
    pub async fn get_subscription_or_load<F, Fut>(
        &self,
        subscription_id: &str,
        loader: F,
    ) -> Result<Subscription>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<Subscription>>,
    {
        // Try to get from cache first
        if let Some(cached) = self.get_subscription(subscription_id).await {
            debug!("Cache hit for subscription");
            return Ok(cached);
        }

        debug!("Cache miss for subscription, loading...");

        // Load from Azure
        let subscription = loader().await?;

        // Store in cache
        let mut subscriptions: Vec<Subscription> = self
            .subscriptions
            .get("subscriptions")
            .await
            .map(|v| v.0)
            .unwrap_or_else(Vec::new);

        subscriptions.push(subscription.clone());

        self.subscriptions
            .insert("subscriptions".to_string(), CachedVec(subscriptions))
            .await;

        info!("Cached subscription {}", subscription_id);
        Ok(subscription)
    }

    // ==================== Subscriptions ====================

    /// Get subscriptions from cache
    pub async fn get_subscriptions(&self) -> Option<Vec<Subscription>> {
        let result = self.subscriptions.get("subscriptions").await;
        if result.is_some() {
            debug!("Cache hit for subscriptions");
        }
        result.map(|v| v.0)
    }

    /// Get subscriptions with automatic loading on cache miss
    pub async fn get_subscriptions_or_load<F, Fut>(
        &self,
        loader: F,
    ) -> Result<Vec<Subscription>, String>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<Vec<Subscription>, String>>,
    {
        // Try to get from cache first
        if let Some(cached) = self.subscriptions.get("subscriptions").await {
            debug!("Cache hit for subscriptions");
            return Ok(cached.0);
        }

        debug!("Cache miss for subscriptions, loading...");

        // Load from Azure
        let subscriptions = loader().await?;

        // Store in cache
        self.subscriptions
            .insert(
                "subscriptions".to_string(),
                CachedVec(subscriptions.clone()),
            )
            .await;

        info!("Cached {} subscriptions", subscriptions.len());
        Ok(subscriptions)
    }

    /// Cache subscriptions
    pub async fn cache_subscriptions(&self, subscriptions: Vec<Subscription>) {
        self.subscriptions
            .insert("subscriptions".to_string(), CachedVec(subscriptions))
            .await;
    }

    /// Invalidate subscriptions cache
    pub async fn invalidate_subscriptions(&self) {
        self.subscriptions.invalidate("subscriptions").await;
        debug!("Invalidated subscriptions cache");
    }

    // ==================== Resource Groups ====================

    /// Get resource groups from cache for a subscription
    pub async fn get_resource_groups(&self, subscription_id: &str) -> Option<Vec<ResourceGroup>> {
        let result = self.resource_groups.get(subscription_id).await;
        if result.is_some() {
            debug!(
                "Cache hit for resource groups in subscription {}",
                subscription_id
            );
        }
        result.map(|v| v.0)
    }

    /// Get resource groups with automatic loading on cache miss
    pub async fn get_resource_groups_or_load<F, Fut>(
        &self,
        subscription_id: &str,
        loader: F,
    ) -> Result<Vec<ResourceGroup>, String>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<Vec<ResourceGroup>, String>>,
    {
        // Try to get from cache first
        if let Some(cached) = self.resource_groups.get(subscription_id).await {
            debug!(
                "Cache hit for resource groups in subscription {}",
                subscription_id
            );
            return Ok(cached.0);
        }

        debug!(
            "Cache miss for resource groups in subscription {}, loading...",
            subscription_id
        );

        // Load from Azure
        let resource_groups = loader().await?;

        // Store in cache
        self.resource_groups
            .insert(
                subscription_id.to_string(),
                CachedVec(resource_groups.clone()),
            )
            .await;

        info!(
            "Cached {} resource groups for subscription {}",
            resource_groups.len(),
            subscription_id
        );
        Ok(resource_groups)
    }

    /// Cache resource groups for a subscription
    pub async fn cache_resource_groups(
        &self,
        subscription_id: &str,
        resource_groups: Vec<ResourceGroup>,
    ) {
        self.resource_groups
            .insert(subscription_id.to_string(), CachedVec(resource_groups))
            .await;
    }

    /// Invalidate resource groups cache for a subscription
    pub async fn invalidate_resource_groups(&self, subscription_id: &str) {
        self.resource_groups.invalidate(subscription_id).await;
        debug!(
            "Invalidated resource groups cache for subscription {}",
            subscription_id
        );
    }

    /// Invalidate all resource groups cache
    pub async fn invalidate_all_resource_groups(&self) {
        self.resource_groups.invalidate_all();
        debug!("Invalidated all resource groups cache");
    }

    // ==================== Key Vaults ====================

    /// Get keyvaults from cache for a subscription
    pub async fn get_keyvaults(&self, subscription_id: &str) -> Option<Vec<KeyVault>> {
        let result = self.keyvaults.get(subscription_id).await;
        if result.is_some() {
            debug!(
                "Cache hit for keyvaults in subscription {}",
                subscription_id
            );
        }
        result.map(|v| v.0)
    }

    /// Get keyvaults with automatic loading on cache miss
    pub async fn get_keyvaults_or_load<F, Fut>(
        &self,
        subscription_id: &str,
        loader: F,
    ) -> Result<Vec<KeyVault>, String>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<Vec<KeyVault>, String>>,
    {
        // Try to get from cache first
        if let Some(cached) = self.keyvaults.get(subscription_id).await {
            debug!(
                "Cache hit for keyvaults in subscription {}",
                subscription_id
            );
            return Ok(cached.0);
        }

        debug!(
            "Cache miss for keyvaults in subscription {}, loading...",
            subscription_id
        );

        // Load from Azure
        let keyvaults = loader().await?;

        // Store in cache
        self.keyvaults
            .insert(subscription_id.to_string(), CachedVec(keyvaults.clone()))
            .await;

        info!(
            "Cached {} keyvaults for subscription {}",
            keyvaults.len(),
            subscription_id
        );
        Ok(keyvaults)
    }

    /// Cache keyvaults for a subscription
    pub async fn cache_keyvaults(&self, subscription_id: &str, keyvaults: Vec<KeyVault>) {
        self.keyvaults
            .insert(subscription_id.to_string(), CachedVec(keyvaults))
            .await;
    }

    /// Invalidate keyvaults cache for a subscription
    pub async fn invalidate_keyvaults(&self, subscription_id: &str) {
        self.keyvaults.invalidate(subscription_id).await;
        debug!(
            "Invalidated keyvaults cache for subscription {}",
            subscription_id
        );
    }

    /// Invalidate all keyvaults cache
    pub async fn invalidate_all_keyvaults(&self) {
        self.keyvaults.invalidate_all();
        debug!("Invalidated all keyvaults cache");
    }

    // ==================== Secrets List ====================

    /// Get secrets list from cache for a vault
    pub async fn get_secrets_list(&self, vault_uri: &str) -> Option<Vec<Secret>> {
        let result = self.secrets_list.get(vault_uri).await;
        if result.is_some() {
            debug!("Cache hit for secrets list in vault {}", vault_uri);
        }
        result.map(|v| v.0)
    }

    /// Get secrets list with automatic loading on cache miss
    pub async fn get_secrets_list_or_load<F, Fut>(
        &self,
        vault_uri: &str,
        loader: F,
    ) -> Result<Vec<Secret>, String>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<Vec<Secret>, String>>,
    {
        // Try to get from cache first
        if let Some(cached) = self.secrets_list.get(vault_uri).await {
            debug!("Cache hit for secrets list in vault {}", vault_uri);
            return Ok(cached.0);
        }

        debug!(
            "Cache miss for secrets list in vault {}, loading...",
            vault_uri
        );

        // Load from Azure
        let secrets = loader().await?;

        // Store in cache
        self.secrets_list
            .insert(vault_uri.to_string(), CachedVec(secrets.clone()))
            .await;

        info!("Cached {} secrets for vault {}", secrets.len(), vault_uri);
        Ok(secrets)
    }

    /// Cache secrets list for a vault
    pub async fn cache_secrets_list(&self, vault_uri: &str, secrets: Vec<Secret>) {
        self.secrets_list
            .insert(vault_uri.to_string(), CachedVec(secrets))
            .await;
    }

    /// Invalidate secrets list cache for a vault
    pub async fn invalidate_secrets_list(&self, vault_uri: &str) {
        self.secrets_list.invalidate(vault_uri).await;
        debug!("Invalidated secrets list cache for vault {}", vault_uri);
    }

    // ==================== Secret Values ====================

    /// Build key for secret value cache
    fn secret_key(vault_uri: &str, secret_name: &str) -> String {
        format!("{}::{}", vault_uri, secret_name)
    }

    /// Get secret value from cache
    pub async fn get_secret_value(
        &self,
        vault_uri: &str,
        secret_name: &str,
    ) -> Option<SecretBundle> {
        let key = Self::secret_key(vault_uri, secret_name);
        let result = self.secret_values.get(&key).await;
        if result.is_some() {
            debug!(
                "Cache hit for secret {} in vault {}",
                secret_name, vault_uri
            );
        }
        result
    }

    /// Get secret value with automatic loading on cache miss
    pub async fn get_secret_value_or_load<F, Fut>(
        &self,
        vault_uri: &str,
        secret_name: &str,
        loader: F,
    ) -> Result<SecretBundle, String>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<SecretBundle, String>>,
    {
        let key = Self::secret_key(vault_uri, secret_name);

        // Try to get from cache first
        if let Some(cached) = self.secret_values.get(&key).await {
            debug!(
                "Cache hit for secret {} in vault {}",
                secret_name, vault_uri
            );
            return Ok(cached);
        }

        debug!(
            "Cache miss for secret {} in vault {}, loading...",
            secret_name, vault_uri
        );

        // Load from Azure
        let secret = loader().await?;

        // Store in cache
        self.secret_values.insert(key, secret.clone()).await;

        debug!("Cached secret {} for vault {}", secret_name, vault_uri);
        Ok(secret)
    }

    /// Cache a secret value
    pub async fn cache_secret_value(&self, vault_uri: &str, secret: SecretBundle) {
        let name = secret.id.split('/').last().unwrap_or("").to_string();
        let key = Self::secret_key(vault_uri, &name);
        self.secret_values.insert(key, secret).await;
    }

    /// Invalidate a secret value
    pub async fn invalidate_secret_value(&self, vault_uri: &str, secret_name: &str) {
        let key = Self::secret_key(vault_uri, secret_name);
        self.secret_values.invalidate(&key).await;
        debug!(
            "Invalidated secret {} cache for vault {}",
            secret_name, vault_uri
        );
    }

    /// Invalidate all secrets for a vault (both list and values)
    pub async fn invalidate_vault_secrets(&self, vault_uri: &str) {
        // Invalidate the secrets list
        self.secrets_list.invalidate(vault_uri).await;

        // Note: We can't easily invalidate all secret values for a vault
        // since Moka doesn't support prefix-based invalidation.
        // The TTL will handle expiration, or we could track keys separately.
        debug!("Invalidated secrets list for vault {}", vault_uri);
    }

    // ==================== Statistics ====================

    /// Get cache statistics
    pub fn get_stats(&self) -> CacheStatistics {
        CacheStatistics {
            subscriptions_count: self.subscriptions.entry_count(),
            resource_groups_count: self.resource_groups.entry_count(),
            keyvaults_count: self.keyvaults.entry_count(),
            secrets_list_count: self.secrets_list.entry_count(),
            secret_values_count: self.secret_values.entry_count(),
        }
    }

    /// Clear all caches
    pub async fn clear_all(&self) {
        self.subscriptions.invalidate_all();
        self.resource_groups.invalidate_all();
        self.keyvaults.invalidate_all();
        self.secrets_list.invalidate_all();
        self.secret_values.invalidate_all();
        info!("Cleared all caches");
    }
}

impl Default for AzureCache {
    fn default() -> Self {
        Self::new()
    }
}

/// Cache statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheStatistics {
    pub subscriptions_count: u64,
    pub resource_groups_count: u64,
    pub keyvaults_count: u64,
    pub secrets_list_count: u64,
    pub secret_values_count: u64,
}

// Global cache instance
lazy_static::lazy_static! {
    pub static ref AZURE_CACHE: Arc<AzureCache> = Arc::new(AzureCache::new());
}
