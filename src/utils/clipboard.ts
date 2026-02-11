/**
 * Clipboard utility functions.
 */

/**
 * Copy text to clipboard with error handling.
 * @param text - Text to copy
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
}

/**
 * Copy text to clipboard with toast notification.
 * @param text - Text to copy
 * @param showSuccess - Success notification callback
 * @param showError - Error notification callback
 */
export async function copyToClipboardWithToast(
  text: string,
  showSuccess: (message: string) => void,
  showError: (title: string, message: string) => void,
): Promise<void> {
  const success = await copyToClipboard(text);
  if (success) {
    showSuccess("Copied to clipboard");
  } else {
    showError("Failed to copy", "Could not access clipboard");
  }
}
