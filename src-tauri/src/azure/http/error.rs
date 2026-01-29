//! Error types for Azure HTTP operations

use std::fmt;

/// Errors that can occur during Azure HTTP operations
#[derive(Debug)]
pub enum AzureHttpError {
    /// Failed to construct a valid HTTP header
    InvalidHeader(String),
    
    /// Network or connection error
    NetworkError(String),
    
    /// Azure API returned an error response
    ApiError {
        status: u16,
        message: String,
    },
    
    /// Failed to parse response body
    ParseError {
        message: String,
        body: Option<String>,
    },
    
    /// Failed to read response body
    ResponseBodyError(String),
    
    /// Serialization error when preparing request body
    SerializationError(String),
    
    /// Token acquisition or refresh error
    TokenError(String),
    
    /// User is not authenticated
    NotAuthenticated,
}

impl fmt::Display for AzureHttpError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AzureHttpError::InvalidHeader(msg) => {
                write!(f, "Invalid header value: {}", msg)
            }
            AzureHttpError::NetworkError(msg) => {
                write!(f, "Network error: {}", msg)
            }
            AzureHttpError::ApiError { status, message } => {
                write!(f, "API request failed with status {}: {}", status, message)
            }
            AzureHttpError::ParseError { message, body } => {
                if let Some(b) = body {
                    write!(f, "Failed to parse response: {}. Body: {}", message, b)
                } else {
                    write!(f, "Failed to parse response: {}", message)
                }
            }
            AzureHttpError::ResponseBodyError(msg) => {
                write!(f, "Failed to read response body: {}", msg)
            }
            AzureHttpError::SerializationError(msg) => {
                write!(f, "Failed to serialize request body: {}", msg)
            }
            AzureHttpError::TokenError(msg) => {
                write!(f, "Token error: {}", msg)
            }
            AzureHttpError::NotAuthenticated => {
                write!(f, "Not authenticated. Please login first.")
            }
        }
    }
}

impl std::error::Error for AzureHttpError {}

// Implement From<reqwest::Error> for convenience
impl From<reqwest::Error> for AzureHttpError {
    fn from(err: reqwest::Error) -> Self {
        AzureHttpError::NetworkError(err.to_string())
    }
}

// Implement Into<String> for Tauri command compatibility
impl From<AzureHttpError> for String {
    fn from(err: AzureHttpError) -> Self {
        err.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = AzureHttpError::ApiError {
            status: 404,
            message: "Not found".to_string(),
        };
        assert_eq!(
            err.to_string(),
            "API request failed with status 404: Not found"
        );
    }

    #[test]
    fn test_error_into_string() {
        let err = AzureHttpError::NetworkError("Connection refused".to_string());
        let s: String = err.into();
        assert_eq!(s, "Network error: Connection refused");
    }
}
