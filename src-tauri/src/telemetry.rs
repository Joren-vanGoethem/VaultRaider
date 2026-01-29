//! Telemetry and tracing initialization
//!
//! This module provides structured logging with tracing, including
//! JSON output and environment-based filtering.

use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};

/// Initialize the tracing subscriber with structured logging.
///
/// This sets up:
/// - JSON formatted output (for structured log aggregation)
/// - Environment-based filtering via `RUST_LOG` env var
/// - Span events for timing information
///
/// # Example
///
/// ```rust,ignore
/// // In lib.rs
/// telemetry::init();
/// ```
pub fn init() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("vaultraider=info,warn"));

    let fmt_layer = fmt::layer()
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .with_span_events(FmtSpan::CLOSE); // Log when spans close (includes duration)

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt_layer)
        .init();
}

/// Initialize tracing with JSON output for production environments.
///
/// This is useful for log aggregation systems like Seq.
#[allow(dead_code)]
pub fn init_json() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("vaultraider=info,warn"));

    let fmt_layer = fmt::layer()
        .json()
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
