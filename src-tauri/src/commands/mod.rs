//! Tauri command handlers
//!
//! This module contains thin wrapper functions that expose the application's
//! business logic as Tauri commands. Each command handles the conversion
//! between Tauri's requirements and the internal service layer.

pub mod auth;
pub mod keyvault;
pub mod subscription;
pub mod resource_group;
