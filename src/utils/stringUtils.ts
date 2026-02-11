/**
 * String utility functions used across the application.
 */

/**
 * Extract the secret name from a full secret ID URL.
 * @param id - Full secret ID (e.g., "https://vault.vault.azure.net/secrets/secret-name/version")
 * @returns The secret name
 */
export function extractSecretName(id: string): string {
  const parts = id.split("/");
  return parts[parts.length - 1];
}

/**
 * Extract the version ID from a secret's full ID URL.
 * @param id - Full secret ID
 * @returns The version ID
 */
export function extractVersionId(id: string): string {
  const parts = id.split("/");
  return parts[parts.length - 1];
}

/**
 * Extract the resource group name from an Azure resource ID.
 * @param resourceId - Azure resource ID
 * @returns The resource group name or undefined if not found
 */
export function extractResourceGroup(resourceId: string): string | undefined {
  const match = resourceId.match(/\/resourceGroups\/([^/]+)\//i);
  return match ? match[1] : undefined;
}

/**
 * Validate if a string is a valid GUID/UUID.
 * @param value - String to validate
 * @returns True if valid GUID format
 */
export function isValidGuid(value: string): boolean {
  if (!value.trim()) return true; // Empty is valid (context-dependent)
  const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return guidRegex.test(value.trim());
}

/**
 * Truncate a string to a maximum length with ellipsis.
 * @param str - String to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Parse Azure API error response to extract meaningful error message.
 * @param error - Error object or string
 * @returns Extracted error message
 */
export function parseAzureError(error: unknown): string {
  let errorMsg = error instanceof Error ? error.message : String(error);

  try {
    const apiFailedPrefix = "API request failed: ";
    if (errorMsg.includes(apiFailedPrefix)) {
      const jsonPart = errorMsg.substring(
        errorMsg.indexOf(apiFailedPrefix) + apiFailedPrefix.length,
      );
      const errorObj = JSON.parse(jsonPart);
      if (errorObj.error?.message) {
        errorMsg = errorObj.error.message;
      } else if (errorObj.error?.code) {
        errorMsg = `${errorObj.error.code}: ${errorObj.error.message || "Unknown error"}`;
      }
    }
  } catch (parseError) {
    // If parsing fails, use the original error message
    console.error("Failed to parse error message:", parseError);
  }

  return errorMsg;
}
