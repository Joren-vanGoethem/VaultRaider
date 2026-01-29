//! Reusable HTTP client for Azure API requests
//!
//! This module provides a generic HTTP client wrapper that handles:
//! - Bearer token authentication
//! - Common headers (Content-Type, etc.)
//! - Request/response logging
//! - Error handling with detailed context
//! - Automatic JSON serialization/deserialization
//!
//! # Example
//!
//! ```rust,ignore
//! use crate::azure::http::{AzureHttpClient, AzureHttpError};
//!
//! let client = AzureHttpClient::new()
//!     .with_bearer_token(&token)?;
//!
//! let vaults: Vec<KeyVault> = client.get(&url).await?;
//! ```

use log::{debug, error};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::{Client, Method, Response};
use serde::de::DeserializeOwned;
use serde::Serialize;

use super::error::AzureHttpError;

/// A reusable HTTP client for making authenticated requests to Azure APIs.
///
/// The client handles common concerns like authentication headers, JSON
/// serialization, error handling, and logging.
#[derive(Clone)]
pub struct AzureHttpClient {
    client: Client,
    base_headers: HeaderMap,
}

impl Default for AzureHttpClient {
    fn default() -> Self {
        Self::new()
    }
}

impl AzureHttpClient {
    /// Creates a new Azure HTTP client with default settings.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let client = AzureHttpClient::new();
    /// ```
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            base_headers: HeaderMap::new(),
        }
    }

    /// Adds a Bearer token to the client for authentication.
    ///
    /// # Arguments
    ///
    /// * `token` - The OAuth2 access token
    ///
    /// # Returns
    ///
    /// Returns `Ok(Self)` with the token added, or an error if the token
    /// contains invalid header characters.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let client = AzureHttpClient::new()
    ///     .with_bearer_token(&token)?;
    /// ```
    pub fn with_bearer_token(mut self, token: &str) -> Result<Self, AzureHttpError> {
        self.base_headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", token)).map_err(|e| {
                error!("Invalid authorization header value: {}", e);
                AzureHttpError::InvalidHeader(e.to_string())
            })?,
        );
        Ok(self)
    }

    /// Adds the JSON content type header to the client.
    ///
    /// This is automatically added for POST, PUT, and PATCH requests
    /// that have a body, but can be called explicitly if needed.
    pub fn with_json_content_type(mut self) -> Self {
        self.base_headers
            .insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        self
    }

    /// Adds a custom header to the client.
    ///
    /// # Arguments
    ///
    /// * `name` - The header name
    /// * `value` - The header value
    ///
    /// # Returns
    ///
    /// Returns `Ok(Self)` with the header added, or an error if the value
    /// contains invalid header characters.
    pub fn with_header(mut self, name: &str, value: &str) -> Result<Self, AzureHttpError> {
        self.base_headers.insert(
            reqwest::header::HeaderName::from_bytes(name.as_bytes())
                .map_err(|e| AzureHttpError::InvalidHeader(e.to_string()))?,
            HeaderValue::from_str(value)
                .map_err(|e| AzureHttpError::InvalidHeader(e.to_string()))?,
        );
        Ok(self)
    }

    /// Returns a reference to the underlying headers.
    ///
    /// Useful for debugging or when you need to inspect the current headers.
    pub fn headers(&self) -> &HeaderMap {
        &self.base_headers
    }

    /// Performs a GET request and deserializes the response as JSON.
    ///
    /// # Arguments
    ///
    /// * `url` - The URL to request
    ///
    /// # Returns
    ///
    /// Returns the deserialized response body, or an error if the request
    /// fails or the response cannot be parsed.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let vaults: Vec<KeyVault> = client.get(&url).await?;
    /// ```
    pub async fn get<T: DeserializeOwned>(&self, url: &str) -> Result<T, AzureHttpError> {
        self.request::<T, ()>(Method::GET, url, None).await
    }

    /// Performs a GET request and returns the raw response text.
    ///
    /// Useful when you need to handle parsing yourself or for debugging.
    ///
    /// # Arguments
    ///
    /// * `url` - The URL to request
    pub async fn get_text(&self, url: &str) -> Result<String, AzureHttpError> {
        self.request_text::<()>(Method::GET, url, None).await
    }

    /// Performs a POST request with a JSON body.
    ///
    /// # Arguments
    ///
    /// * `url` - The URL to request
    /// * `body` - The request body to serialize as JSON
    ///
    /// # Returns
    ///
    /// Returns the deserialized response body, or an error if the request
    /// fails or the response cannot be parsed.
    pub async fn post<T, B>(&self, url: &str, body: &B) -> Result<T, AzureHttpError>
    where
        T: DeserializeOwned,
        B: Serialize,
    {
        self.request(Method::POST, url, Some(body)).await
    }

    /// Performs a PUT request with a JSON body.
    ///
    /// # Arguments
    ///
    /// * `url` - The URL to request
    /// * `body` - The request body to serialize as JSON
    ///
    /// # Returns
    ///
    /// Returns the deserialized response body, or an error if the request
    /// fails or the response cannot be parsed.
    pub async fn put<T, B>(&self, url: &str, body: &B) -> Result<T, AzureHttpError>
    where
        T: DeserializeOwned,
        B: Serialize,
    {
        self.request(Method::PUT, url, Some(body)).await
    }

    /// Performs a DELETE request.
    ///
    /// # Arguments
    ///
    /// * `url` - The URL to request
    ///
    /// # Returns
    ///
    /// Returns the deserialized response body, or an error if the request
    /// fails or the response cannot be parsed.
    pub async fn delete<T: DeserializeOwned>(&self, url: &str) -> Result<T, AzureHttpError> {
        self.request::<T, ()>(Method::DELETE, url, None).await
    }

    /// Performs a DELETE request without expecting a response body.
    ///
    /// # Arguments
    ///
    /// * `url` - The URL to request
    pub async fn delete_no_content(&self, url: &str) -> Result<(), AzureHttpError> {
        let response = self.send_request::<()>(Method::DELETE, url, None).await?;
        self.check_status(response).await?;
        Ok(())
    }

    /// Performs a PATCH request with a JSON body.
    ///
    /// # Arguments
    ///
    /// * `url` - The URL to request
    /// * `body` - The request body to serialize as JSON
    ///
    /// # Returns
    ///
    /// Returns the deserialized response body, or an error if the request
    /// fails or the response cannot be parsed.
    pub async fn patch<T, B>(&self, url: &str, body: &B) -> Result<T, AzureHttpError>
    where
        T: DeserializeOwned,
        B: Serialize,
    {
        self.request(Method::PATCH, url, Some(body)).await
    }

    /// Internal method to perform a request and deserialize the response.
    async fn request<T, B>(
        &self,
        method: Method,
        url: &str,
        body: Option<&B>,
    ) -> Result<T, AzureHttpError>
    where
        T: DeserializeOwned,
        B: Serialize,
    {
        let response_text = self.request_text(method, url, body).await?;

        debug!("Response body length: {} bytes", response_text.len());

        serde_json::from_str(&response_text).map_err(|e| {
            error!("Failed to parse response: {}", e);
            error!("Response body: {}", response_text);
            AzureHttpError::ParseError {
                message: e.to_string(),
                body: Some(response_text),
            }
        })
    }

    /// Internal method to perform a request and return the raw response text.
    async fn request_text<B>(
        &self,
        method: Method,
        url: &str,
        body: Option<&B>,
    ) -> Result<String, AzureHttpError>
    where
        B: Serialize,
    {
        let response = self.send_request(method, url, body).await?;
        let response = self.check_status(response).await?;

        response.text().await.map_err(|e| {
            error!("Failed to read response body: {}", e);
            AzureHttpError::ResponseBodyError(e.to_string())
        })
    }

    /// Internal method to send the HTTP request.
    async fn send_request<B>(
        &self,
        method: Method,
        url: &str,
        body: Option<&B>,
    ) -> Result<Response, AzureHttpError>
    where
        B: Serialize,
    {
        debug!("Sending {} request to: {}", method, url);

        let mut request = self.client.request(method.clone(), url);
        request = request.headers(self.base_headers.clone());

        // Add JSON content type and body for methods that typically have a body
        if let Some(body) = body {
            request = request.header(CONTENT_TYPE, "application/json");
            let body_json = serde_json::to_string(body).map_err(|e| {
                error!("Failed to serialize request body: {}", e);
                AzureHttpError::SerializationError(e.to_string())
            })?;
            debug!("Request body: {}", body_json);
            request = request.body(body_json);
        }

        request.send().await.map_err(|e| {
            error!("Failed to send request to {}: {}", url, e);
            AzureHttpError::NetworkError(e.to_string())
        })
    }

    /// Internal method to check response status and return error for non-success codes.
    async fn check_status(&self, response: Response) -> Result<Response, AzureHttpError> {
        let status = response.status();
        debug!("Response status: {}", status);

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            error!("API request failed with status {}: {}", status, error_text);
            return Err(AzureHttpError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        Ok(response)
    }
}

/// Builder pattern extension for creating clients with tokens from async sources.
impl AzureHttpClient {
    /// Creates a new client with a bearer token, useful for one-liner construction.
    ///
    /// # Arguments
    ///
    /// * `token` - The OAuth2 access token
    ///
    /// # Returns
    ///
    /// Returns a new client configured with the bearer token.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let client = AzureHttpClient::with_token(&token)?;
    /// ```
    pub fn with_token(token: &str) -> Result<Self, AzureHttpError> {
        Self::new().with_bearer_token(token)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = AzureHttpClient::new();
        assert!(client.headers().is_empty());
    }

    #[test]
    fn test_client_with_token() {
        let client = AzureHttpClient::new()
            .with_bearer_token("test_token")
            .unwrap();
        assert!(client.headers().contains_key(AUTHORIZATION));
    }

    #[test]
    fn test_client_with_json_content_type() {
        let client = AzureHttpClient::new().with_json_content_type();
        assert!(client.headers().contains_key(CONTENT_TYPE));
    }

    #[test]
    fn test_client_with_custom_header() {
        let client = AzureHttpClient::new()
            .with_header("X-Custom-Header", "test_value")
            .unwrap();
        assert!(client
            .headers()
            .contains_key("X-Custom-Header".to_lowercase().as_str()));
    }
}
