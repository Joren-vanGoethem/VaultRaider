//! Tauri command handlers
//!
//! This module contains thin wrapper functions that expose the application's
//! business logic as Tauri commands. Each command handles the conversion
//! between Tauri's requirements and the internal service layer.

pub mod activity_log;
pub mod auth;
pub mod cache;
pub mod config;
pub mod keyvault;
pub mod resource_group;
pub mod subscription;
