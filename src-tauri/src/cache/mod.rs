//! Caching module for Azure API calls
//!
//! Provides in-memory caching with TTL-based expiration using Moka.

mod moka_cache;

pub use moka_cache::{CacheStatistics, AZURE_CACHE};
