﻿# VaultRaider Codebase Improvement Roadmap

This document outlines actionable steps to improve the VaultRaider codebase focusing on **reusability**, **readability**, and **observability**.

---

## Table of Contents

1. [Reusability Improvements](#1-reusability-improvements)
2. [Readability Improvements](#2-readability-improvements)
3. [Observability & Error Handling](#3-observability--error-handling)
4. [OpenTelemetry Integration](#4-opentelemetry-integration)
5. [Implementation Priority](#5-implementation-priority)

---

## 1. Reusability Improvements

### 1.1 Create a Generic HTTP Client Wrapper

**Problem:** HTTP client setup and header management is duplicated across `keyvault/client.rs`, `resource_group/client.rs`, `subscriptions.rs`, and `secret/client.rs`.

**Solution:** Create a reusable Azure HTTP client module.

```rust
// src/azure/http/client.rs
use reqwest::{Client, Response, Method};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};

pub struct AzureHttpClient {
    client: Client,
    base_headers: HeaderMap,
}

impl AzureHttpClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            base_headers: HeaderMap::new(),
        }
    }

    pub fn with_bearer_token(mut self, token: &str) -> Result<Self, AzureHttpError> {
        self.base_headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", token))
                .map_err(|e| AzureHttpError::InvalidHeader(e.to_string()))?,
        );
        Ok(self)
    }

    pub async fn get<T: serde::de::DeserializeOwned>(&self, url: &str) -> Result<T, AzureHttpError> {
        self.request(Method::GET, url, None::<()>).await
    }

    pub async fn post<T, B>(&self, url: &str, body: &B) -> Result<T, AzureHttpError>
    where
        T: serde::de::DeserializeOwned,
        B: serde::Serialize,
    {
        self.request(Method::POST, url, Some(body)).await
    }

    // ... DELETE, PUT, PATCH methods
}
```

### 1.2 Create a Generic Pagination Handler

**Problem:** Pagination logic using `nextLink` is duplicated in `fetch_keyvaults`, `fetch_resource_groups`, and `fetch_secrets`.

**Solution:** Create a generic paginated fetch function.

```rust
// src/azure/http/pagination.rs
pub async fn fetch_all_paginated<T, F, Fut>(
    initial_url: String,
    client: &AzureHttpClient,
    extract_next_link: F,
) -> Result<Vec<T>, AzureHttpError>
where
    T: serde::de::DeserializeOwned,
    F: Fn(&AzureListResponse<T>) -> Option<String>,
{
    let mut results = Vec::new();
    let mut current_url = Some(initial_url);
    
    while let Some(url) = current_url {
        let response: AzureListResponse<T> = client.get(&url).await?;
        results.extend(response.value);
        current_url = extract_next_link(&response);
    }
    
    Ok(results)
}
```

### 1.3 Unify Error Types with `thiserror`

**Problem:** Errors are returned as `String` throughout the codebase, losing type information and making error handling inconsistent.

**Solution:** Create a custom error enum using `thiserror`.

```rust
// src/error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum VaultRaiderError {
    #[error("Authentication failed: {0}")]
    AuthenticationError(String),
    
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),
    
    #[error("JSON parsing failed at {path}: {message}")]
    ParseError { path: String, message: String },
    
    #[error("Token error: {0}")]
    TokenError(String),
    
    #[error("Azure API error (status {status}): {message}")]
    AzureApiError { status: u16, message: String },
    
    #[error("Not authenticated. Please login first.")]
    NotAuthenticated,
}

// Implement Into<String> for Tauri command compatibility
impl From<VaultRaiderError> for String {
    fn from(err: VaultRaiderError) -> Self {
        err.to_string()
    }
}
```

### 1.4 Extract Token Management into a Trait ✅

**Problem:** Token retrieval logic is scattered and doesn't support different authentication scopes cleanly.

**Solution:** Created a `TokenProvider` trait in `src/azure/auth/provider.rs`.

```rust
// src/azure/auth/provider.rs (IMPLEMENTED)
use async_trait::async_trait;
use crate::azure::http::AzureHttpError;

/// Token scopes
pub const MANAGEMENT_SCOPE: &str = "https://management.azure.com/.default";
pub const KEYVAULT_SCOPE: &str = "https://vault.azure.net/.default";

#[async_trait]
pub trait TokenProvider: Send + Sync {
    async fn get_management_token(&self) -> Result<String, AzureHttpError>;
    async fn get_keyvault_token(&self) -> Result<String, AzureHttpError>;
    async fn get_token_for_scope(&self, scope: &str) -> Result<String, AzureHttpError>;
    async fn is_authenticated(&self) -> bool;
}

/// Credential-based implementation
pub struct CredentialTokenProvider { /* ... */ }

/// Global state-backed implementation (backwards compatible)
pub struct GlobalTokenProvider;
```

**Implementations:**
- `CredentialTokenProvider` - Wraps an Azure SDK `TokenCredential`
- `GlobalTokenProvider` - Uses the global `AUTH_CREDENTIAL` state (backwards compatible)

---

## 2. Readability Improvements

### 2.1 Reorganize Module Structure ✅

**Problem:** 
- `auth/auth.rs` has redundant naming
- Commands are mixed with business logic in `lib.rs`
- Constants are scattered across modules

**Solution:** Reorganized into a clean layered architecture.

**New Structure (IMPLEMENTED):**
```
src/
├── lib.rs                    # App entry point only
├── config.rs                 # Centralized configuration and URL builders
├── commands/                 # Tauri commands (thin wrappers)
│   ├── mod.rs
│   ├── auth.rs
│   ├── keyvault.rs
│   ├── subscription.rs
│   └── resource_group.rs
├── azure/
│   ├── mod.rs
│   ├── http/                 # Reusable HTTP utilities
│   │   ├── mod.rs
│   │   ├── client.rs
│   │   ├── error.rs
│   │   └── pagination.rs
│   ├── auth/
│   │   ├── mod.rs
│   │   ├── service.rs        # Renamed from auth.rs
│   │   ├── provider.rs
│   │   ├── interactive.rs    # Renamed from interactive_browser.rs
│   │   ├── device_code.rs
│   │   └── ...
│   ├── keyvault/
│   │   ├── mod.rs
│   │   ├── service.rs        # Business logic
│   │   ├── types.rs
│   │   └── secret/
│   │       ├── mod.rs
│   │       ├── service.rs
│   │       └── types.rs
│   ├── subscription/
│   │   ├── mod.rs
│   │   ├── service.rs
│   │   └── types.rs
│   └── resource_group/
│       ├── mod.rs
│       ├── service.rs
│       └── types.rs
```

**Key Improvements:**
- Commands in `commands/` module (thin wrappers calling services)
- Business logic in `service.rs` files
- All constants centralized in `config.rs` with URL builder functions
- Backwards-compatible re-exports for gradual migration

### 2.2 Separate Commands from Business Logic

**Problem:** `lib.rs` mixes Tauri command definitions with imports, making it harder to maintain.

**Solution:** Create dedicated command modules that are thin wrappers.

```rust
// src/commands/auth.rs
use crate::azure::auth::provider::{login, logout, is_authenticated, get_user_info};
use crate::azure::auth::types::{AuthResult, DeviceCodeInfo, UserInfo};

#[tauri::command]
pub async fn azure_login() -> Result<AuthResult, String> {
    login().await.map_err(Into::into)
}

#[tauri::command]
pub async fn check_auth() -> bool {
    is_authenticated().await
}

// ... other auth commands
```

### 2.3 Add Documentation Comments

**Problem:** Many functions lack documentation explaining their purpose, parameters, and return values.

**Solution:** Add comprehensive rustdoc comments.

```rust
/// Fetches all Key Vaults accessible in the specified Azure subscription.
///
/// # Arguments
///
/// * `subscription_id` - The Azure subscription ID to query
///
/// # Returns
///
/// A vector of `KeyVault` objects, or an error if the request fails.
///
/// # Errors
///
/// This function will return an error if:
/// - The user is not authenticated
/// - The API request fails
/// - The response cannot be parsed
///
/// # Example
///
/// ```rust
/// let vaults = get_keyvaults("12345-abcde-67890").await?;
/// for vault in vaults {
///     println!("Found vault: {}", vault.name);
/// }
/// ```
pub async fn get_keyvaults(subscription_id: &str) -> Result<Vec<KeyVault>, VaultRaiderError> {
    // ...
}
```

### 2.4 Use Type Aliases for Complex Types

**Problem:** Some types like `Arc<Mutex<Option<Arc<dyn TokenCredential>>>>` are hard to read.

**Solution:** Create type aliases.

```rust
// src/azure/auth/state.rs
pub type SharedCredential = Arc<dyn TokenCredential>;
pub type CredentialStore = Arc<Mutex<Option<SharedCredential>>>;

lazy_static! {
    pub static ref AUTH_CREDENTIAL: CredentialStore = Arc::new(Mutex::new(None));
}
```

### 2.5 Remove TODO Comments and Track in Issues

**Problem:** TODOs like `// TODO@JOREN: should we not use the struct in the lib file` are scattered in code.

**Solution:** Create GitHub issues for each TODO and reference them in code or remove.

---

## 3. Observability & Error Handling

### 3.1 Structured Logging with Context ✅

**Problem:** Current logging lacks context like request IDs, user info, and operation timing.

**Solution:** Implemented structured logging with `tracing` instead of `log`.

**Dependencies Added (Cargo.toml):**
```toml
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["json", "env-filter"] }
uuid = { version = "1.0", features = ["v4"] }
```

**Telemetry Module Created (`src/telemetry.rs`):**
```rust
// Initializes tracing with environment-based filtering
pub fn init() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("vaultraider=info,warn"));

    let fmt_layer = fmt::layer()
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .with_span_events(FmtSpan::CLOSE);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt_layer)
        .init();
}
```

**Service Methods Instrumented:**
```rust
// Example from keyvault/service.rs
#[instrument(
    name = "keyvault.list",
    skip(subscription_id),
    fields(
        subscription_id = %subscription_id,
        vault_count = tracing::field::Empty,
        otel.kind = "client",
    )
)]
pub async fn get_keyvaults(subscription_id: &str) -> Result<Vec<KeyVault>, String> {
    info!("Fetching keyvaults");
    // ...
    Span::current().record("vault_count", kv_list.len());
    info!(count = kv_list.len(), "Successfully retrieved keyvaults");
    Ok(kv_list)
}
```

**HTTP Client Instrumented with Request IDs:**
```rust
#[instrument(
    name = "azure_http_request",
    skip(self, body),
    fields(
        request_id = %uuid::Uuid::new_v4(),
        http.method = %method,
        http.url = %url,
        http.status_code = tracing::field::Empty,
        response_size_bytes = tracing::field::Empty,
    )
)]
async fn request<T, B>(&self, method: Method, url: &str, body: Option<&B>) -> Result<T, AzureHttpError>
```

**Files Updated:**
- `src/telemetry.rs` - New telemetry initialization module
- `src/lib.rs` - Calls `telemetry::init()` on startup
- `src/azure/http/client.rs` - HTTP requests with request IDs and timing
- `src/azure/http/pagination.rs` - Pagination with structured logging
- `src/azure/keyvault/service.rs` - Key Vault operations instrumented
- `src/azure/keyvault/secret/service.rs` - Secret operations instrumented
- `src/azure/subscription/service.rs` - Subscription operations instrumented
- `src/azure/resource_group/service.rs` - Resource group operations instrumented
- `src/azure/auth/provider.rs` - Token acquisition instrumented

### 3.2 Implement Request/Response Logging Middleware

```rust
// src/azure/http/middleware.rs
use tracing::{info_span, Instrument};
use std::time::Instant;

impl AzureHttpClient {
    pub async fn request_with_logging<T, B>(
        &self,
        method: Method,
        url: &str,
        body: Option<&B>,
    ) -> Result<T, AzureHttpError>
    where
        T: serde::de::DeserializeOwned,
        B: serde::Serialize,
    {
        let request_id = uuid::Uuid::new_v4().to_string();
        let start = Instant::now();
        
        let span = info_span!(
            "azure_api_call",
            request_id = %request_id,
            method = %method,
            url = %url,
            status = tracing::field::Empty,
            duration_ms = tracing::field::Empty
        );
        
        async {
            let result = self.do_request(method, url, body).await;
            
            let duration = start.elapsed().as_millis();
            Span::current().record("duration_ms", duration);
            
            match &result {
                Ok(_) => {
                    Span::current().record("status", "success");
                    info!("Request completed successfully");
                }
                Err(e) => {
                    Span::current().record("status", "error");
                    error!(error = %e, "Request failed");
                }
            }
            
            result
        }
        .instrument(span)
        .await
    }
}
```

### 3.3 Implement Error Context with `anyhow`

```toml
# Cargo.toml
[dependencies]
anyhow = "1.0"
```

```rust
use anyhow::{Context, Result};

pub async fn get_keyvaults(subscription_id: &str) -> Result<Vec<KeyVault>> {
    let token = get_token_from_state()
        .await
        .context("Failed to retrieve authentication token")?;
    
    let response = client
        .get(&url)
        .headers(headers)
        .send()
        .await
        .with_context(|| format!("Failed to fetch keyvaults for subscription {}", subscription_id))?;
    
    // ...
}
```

### 3.4 Add Health Check Endpoint

```rust
// src/commands/health.rs
use serde::Serialize;

#[derive(Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
    pub authenticated: bool,
    pub timestamp: String,
}

#[tauri::command]
pub async fn health_check() -> HealthStatus {
    HealthStatus {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        authenticated: is_authenticated().await,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }
}
```

---

## 4. OpenTelemetry Integration

### 4.1 Add OpenTelemetry Dependencies

```toml
# Cargo.toml
[dependencies]
opentelemetry = "0.21"
opentelemetry_sdk = { version = "0.21", features = ["rt-tokio"] }
opentelemetry-otlp = { version = "0.14", features = ["tonic"] }
tracing-opentelemetry = "0.22"
```

### 4.2 Initialize OpenTelemetry with Jaeger

```rust
// src/telemetry.rs
use opentelemetry::global;
use opentelemetry_sdk::{
    runtime::Tokio,
    trace::{BatchConfig, RandomIdGenerator, Sampler, Tracer},
    Resource,
};
use opentelemetry_otlp::WithExportConfig;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub fn init_telemetry(service_name: &str, otlp_endpoint: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Create OTLP exporter for Jaeger
    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint(otlp_endpoint), // e.g., "http://localhost:4317"
        )
        .with_trace_config(
            opentelemetry_sdk::trace::config()
                .with_sampler(Sampler::AlwaysOn)
                .with_id_generator(RandomIdGenerator::default())
                .with_resource(Resource::new(vec![
                    opentelemetry::KeyValue::new("service.name", service_name.to_string()),
                    opentelemetry::KeyValue::new("service.version", env!("CARGO_PKG_VERSION")),
                ])),
        )
        .install_batch(Tokio)?;

    // Create tracing layer
    let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer);

    // Create subscriber with multiple layers
    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env().add_directive("vaultraider=debug".parse()?))
        .with(telemetry_layer)
        .with(tracing_subscriber::fmt::layer().json()) // JSON logs for Seq
        .init();

    Ok(())
}

pub fn shutdown_telemetry() {
    global::shutdown_tracer_provider();
}
```

### 4.3 Configure for Seq (HTTP/JSON)

For Seq integration, use the JSON log output or OTLP:

```rust
// Alternative: Direct Seq integration via HTTP
use reqwest::Client;
use serde_json::json;

pub struct SeqLogger {
    client: Client,
    endpoint: String,
    api_key: Option<String>,
}

impl SeqLogger {
    pub fn new(endpoint: &str, api_key: Option<&str>) -> Self {
        Self {
            client: Client::new(),
            endpoint: format!("{}/api/events/raw", endpoint),
            api_key: api_key.map(String::from),
        }
    }

    pub async fn log(&self, level: &str, message: &str, properties: serde_json::Value) {
        let event = json!({
            "@t": chrono::Utc::now().to_rfc3339(),
            "@mt": message,
            "@l": level,
            "Properties": properties
        });

        let mut request = self.client.post(&self.endpoint).json(&event);
        
        if let Some(ref key) = self.api_key {
            request = request.header("X-Seq-ApiKey", key);
        }

        let _ = request.send().await;
    }
}
```

### 4.4 Add Custom Spans for Key Operations

```rust
// src/azure/keyvault/service.rs
use tracing::{instrument, info_span, Instrument};

#[instrument(
    name = "keyvault.get_secret",
    skip(keyvault_uri, secret_name),
    fields(
        otel.kind = "client",
        otel.status_code = tracing::field::Empty,
        keyvault.uri = %keyvault_uri,
        secret.name = %secret_name,
    )
)]
pub async fn get_secret(
    keyvault_uri: &str,
    secret_name: &str,
    secret_version: Option<&str>,
) -> Result<SecretBundle, VaultRaiderError> {
    // Operation is automatically traced
    let result = fetch_secret_internal(keyvault_uri, secret_name, secret_version).await;
    
    match &result {
        Ok(_) => Span::current().record("otel.status_code", "OK"),
        Err(e) => {
            Span::current().record("otel.status_code", "ERROR");
            tracing::error!(error = %e, "Failed to fetch secret");
        }
    }
    
    result
}
```

### 4.5 Add Metrics Collection

```rust
// src/telemetry/metrics.rs
use opentelemetry::{global, KeyValue};
use opentelemetry_sdk::metrics::MeterProvider;

lazy_static! {
    static ref METER: opentelemetry::metrics::Meter = 
        global::meter("vaultraider");
    
    pub static ref API_CALLS_COUNTER: opentelemetry::metrics::Counter<u64> = 
        METER.u64_counter("api_calls_total")
            .with_description("Total number of Azure API calls")
            .init();
    
    pub static ref API_LATENCY_HISTOGRAM: opentelemetry::metrics::Histogram<f64> = 
        METER.f64_histogram("api_latency_seconds")
            .with_description("API call latency in seconds")
            .init();
}

// Usage in HTTP client
pub async fn request<T>(&self, method: Method, url: &str) -> Result<T, AzureHttpError> {
    let start = std::time::Instant::now();
    let labels = [
        KeyValue::new("method", method.to_string()),
        KeyValue::new("endpoint", extract_endpoint(url)),
    ];
    
    let result = self.do_request(method, url).await;
    
    let duration = start.elapsed().as_secs_f64();
    API_LATENCY_HISTOGRAM.record(duration, &labels);
    API_CALLS_COUNTER.add(1, &labels);
    
    result
}
```

### 4.6 Update Main Entry Point

```rust
// src/lib.rs
mod telemetry;

pub fn run() {
    // Initialize telemetry early
    if let Ok(otlp_endpoint) = std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT") {
        telemetry::init_telemetry("vaultraider", &otlp_endpoint)
            .expect("Failed to initialize telemetry");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // ... commands
        ])
        .on_window_event(|event| {
            if let tauri::WindowEvent::Destroyed = event.event() {
                telemetry::shutdown_telemetry();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 5. Implementation Priority

### Phase 1: Foundation (Week 1-2)
- [x] Create unified error types with `thiserror` (Implemented as `AzureHttpError`)
- [x] Implement generic HTTP client wrapper (Implemented in `src/azure/http/`)
- [x] Add generic pagination handler (Implemented in `src/azure/http/pagination.rs`)
- [x] Extract token management into a trait (Implemented in `src/azure/auth/provider.rs`)
- [x] Reorganize module structure (Implemented with `commands/`, `config.rs`, service layers)

### Phase 2: Observability (Week 3-4)
- [x] Migrate from `log` to `tracing` (Implemented in all service modules)
- [x] Add structured logging with context (Implemented with `#[instrument]` macros)
- [x] Implement request/response logging middleware (Implemented in `http/client.rs`)
- [ ] Add documentation comments to public APIs

### Phase 3: OpenTelemetry (Week 5-6)
- [ ] Add OpenTelemetry dependencies
- [ ] Configure OTLP exporter for Jaeger
- [ ] Instrument key operations with spans
- [ ] Add metrics collection

### Phase 4: Polish (Week 7-8)
- [ ] Add health check endpoint
- [ ] Configure Seq integration (optional)
- [ ] Write integration tests with tracing assertions
- [ ] Create runbook for debugging with traces

---

## Docker Compose for Local Observability Stack

```yaml
# docker-compose.observability.yml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:1.52
    ports:
      - "16686:16686"  # Jaeger UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  seq:
    image: datalust/seq:latest
    ports:
      - "5341:80"      # Seq UI
      - "5342:5341"    # Ingestion API
    environment:
      - ACCEPT_EULA=Y

  # Optional: Grafana for metrics visualization
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

### Running the Stack

```powershell
# Start observability stack
docker-compose -f docker-compose.observability.yml up -d

# Set environment variable for the app
$env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317"

# Run the app
cargo tauri dev
```

### Viewing Traces

- **Jaeger UI**: http://localhost:16686
- **Seq UI**: http://localhost:5341
- **Grafana**: http://localhost:3000

---

## Summary

| Area | Current State | Target State |
|------|--------------|--------------|
| Error Handling | String-based errors | Typed errors with `thiserror` |
| HTTP Client | Duplicated across modules | Single reusable client |
| Pagination | Copy-pasted logic | Generic pagination utility |
| Logging | Basic `log` crate | Structured `tracing` with spans |
| Observability | Limited console logs | Full OpenTelemetry integration |
| Module Organization | Mixed concerns | Clean separation of concerns |
| Documentation | Sparse | Comprehensive rustdoc |

By following this roadmap, VaultRaider will have:
- **Better maintainability** through code reuse
- **Clearer code** through proper organization and documentation
- **Full observability** through distributed tracing, structured logs, and metrics
