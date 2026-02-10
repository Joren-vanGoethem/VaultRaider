/**
 * Utility functions for route guards and authentication checks.
 * Use these in route beforeLoad functions.
 */
import { redirect } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";

/**
 * Checks if the user is authenticated. Use in beforeLoad to protect routes.
 * @returns A Promise that resolves if authenticated, or throws a redirect to "/" if not.
 * @example
 * beforeLoad: async () => {
 *   await requireAuth();
 * },
 */
export async function requireAuth(): Promise<void> {
  const isAuthenticated = await invoke<boolean>("check_auth");
  if (!isAuthenticated) {
    throw redirect({ to: "/" });
  }
}
