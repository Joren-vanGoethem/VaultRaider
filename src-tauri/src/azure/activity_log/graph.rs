//! Microsoft Graph directory object resolution service
//!
//! This module provides functionality to resolve Azure AD object IDs
//! (users, service principals) to their display names using the
//! Microsoft Graph API's `directoryObjects/getByIds` endpoint.

use anyhow::{Context, Result};
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::azure::auth::token::get_token_for_scope;
use crate::azure::http::AzureHttpClient;

/// Microsoft Graph API scope
const GRAPH_SCOPE: &str = "https://graph.microsoft.com/.default";

/// Maximum number of IDs per batch request (Graph API limit is 1000)
const MAX_IDS_PER_BATCH: usize = 100;

/// Request body for the getByIds endpoint
#[derive(Debug, Serialize)]
struct GetByIdsRequest {
    ids: Vec<String>,
    types: Vec<String>,
}

/// A single directory object returned by the Graph API
#[derive(Debug, Deserialize)]
struct DirectoryObject {
    /// The object ID
    id: Option<String>,

    /// The OData type (e.g., "#microsoft.graph.user", "#microsoft.graph.servicePrincipal")
    #[serde(rename = "@odata.type")]
    odata_type: Option<String>,

    /// Display name (available on users and service principals)
    #[serde(rename = "displayName")]
    display_name: Option<String>,

    /// User principal name (only on users)
    #[serde(rename = "userPrincipalName")]
    user_principal_name: Option<String>,

    /// App display name (only on service principals)
    #[serde(rename = "appDisplayName")]
    app_display_name: Option<String>,
}

/// Response from the getByIds endpoint
#[derive(Debug, Deserialize)]
struct GetByIdsResponse {
    value: Vec<DirectoryObject>,
}

/// Resolved identity information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedCaller {
    /// The original object ID
    pub id: String,
    /// The resolved display name
    pub display_name: String,
    /// The type of the object ("user", "servicePrincipal", "app", "unknown")
    pub caller_type: String,
    /// User principal name if available (email for users)
    pub user_principal_name: Option<String>,
}

/// Resolve a list of Azure AD object IDs to display names using the Microsoft Graph API.
///
/// Takes a list of caller strings from activity log events. Only GUIDs are resolved;
/// email addresses and other formats are passed through as-is.
///
/// # Arguments
///
/// * `caller_ids` - A list of caller identifiers (GUIDs, emails, etc.)
///
/// # Returns
///
/// A map from original caller ID to resolved display information.
pub async fn resolve_caller_identities(
    caller_ids: Vec<String>,
) -> Result<HashMap<String, ResolvedCaller>, String> {
    resolve_caller_identities_internal(caller_ids)
        .await
        .map_err(|e| {
            error!("Failed to resolve caller identities: {}", e);
            e.to_string()
        })
}

/// Check if a string looks like a GUID/UUID
fn is_guid(s: &str) -> bool {
    // UUID format: 8-4-4-4-12 hex chars
    let s = s.trim();
    if s.len() != 36 {
        return false;
    }
    s.chars()
        .enumerate()
        .all(|(i, c)| match i {
            8 | 13 | 18 | 23 => c == '-',
            _ => c.is_ascii_hexdigit(),
        })
}

async fn resolve_caller_identities_internal(
    caller_ids: Vec<String>,
) -> Result<HashMap<String, ResolvedCaller>> {
    // Separate GUIDs from non-GUIDs (emails, etc.)
    let mut results = HashMap::new();
    let mut guids_to_resolve: Vec<String> = Vec::new();

    for caller in &caller_ids {
        if is_guid(caller) {
            guids_to_resolve.push(caller.clone());
        }
        // Non-GUID callers don't need resolution - the frontend already handles them
    }

    // Deduplicate
    guids_to_resolve.sort();
    guids_to_resolve.dedup();

    if guids_to_resolve.is_empty() {
        info!("No GUIDs to resolve, all callers are already identified");
        return Ok(results);
    }

    info!(
        "Resolving {} unique caller GUIDs via Microsoft Graph",
        guids_to_resolve.len()
    );

    // Get a token for Microsoft Graph
    let token = get_token_for_scope(GRAPH_SCOPE)
        .await
        .map_err(|e| anyhow::anyhow!(e))
        .context("Failed to get Microsoft Graph token")?;

    let client = AzureHttpClient::new()
        .with_bearer_token(&token)
        .context("Failed to create HTTP client for Graph API")?;

    // Process in batches
    for chunk in guids_to_resolve.chunks(MAX_IDS_PER_BATCH) {
        debug!("Resolving batch of {} GUIDs", chunk.len());

        let request_body = GetByIdsRequest {
            ids: chunk.to_vec(),
            types: vec![
                "user".to_string(),
                "servicePrincipal".to_string(),
            ],
        };

        let response: GetByIdsResponse = match client
            .post(
                "https://graph.microsoft.com/v1.0/directoryObjects/getByIds",
                &request_body,
            )
            .await
        {
            Ok(resp) => resp,
            Err(e) => {
                warn!("Failed to resolve caller batch via Graph API: {}", e);
                // Don't fail the whole operation - just skip unresolved IDs
                continue;
            }
        };

        for obj in response.value {
            if let Some(id) = &obj.id {
                let (display_name, caller_type) = match obj.odata_type.as_deref() {
                    Some("#microsoft.graph.user") => {
                        let name = obj
                            .display_name
                            .clone()
                            .unwrap_or_else(|| id.clone());
                        (name, "user".to_string())
                    }
                    Some("#microsoft.graph.servicePrincipal") => {
                        let name = obj
                            .app_display_name
                            .clone()
                            .or(obj.display_name.clone())
                            .unwrap_or_else(|| id.clone());
                        (name, "servicePrincipal".to_string())
                    }
                    Some(t) => {
                        let name = obj
                            .display_name
                            .clone()
                            .unwrap_or_else(|| id.clone());
                        debug!("Unknown directory object type: {}", t);
                        (name, "unknown".to_string())
                    }
                    None => {
                        let name = obj
                            .display_name
                            .clone()
                            .unwrap_or_else(|| id.clone());
                        (name, "unknown".to_string())
                    }
                };

                results.insert(
                    id.clone(),
                    ResolvedCaller {
                        id: id.clone(),
                        display_name,
                        caller_type,
                        user_principal_name: obj.user_principal_name,
                    },
                );
            }
        }

        debug!(
            "Resolved {} out of {} GUIDs in this batch",
            results.len(),
            chunk.len()
        );
    }

    info!(
        "Successfully resolved {} out of {} caller identities",
        results.len(),
        guids_to_resolve.len()
    );

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_guid() {
        assert!(is_guid("550e8400-e29b-41d4-a716-446655440000"));
        assert!(is_guid("ABCDEF12-3456-7890-ABCD-EF1234567890"));
        assert!(!is_guid("not-a-guid"));
        assert!(!is_guid("user@example.com"));
        assert!(!is_guid(""));
        assert!(!is_guid("550e8400-e29b-41d4-a716-44665544000")); // too short
    }
}
