import { invoke } from "@tauri-apps/api/core";
import type { KeyVault, KeyVaultAccess } from "~/types/keyvault.ts";
import type { ResourceGroup } from "~/types/resourceGroups.ts";
import type { Secret, SecretBundle } from "~/types/secrets.ts";
import type { Subscription } from "~/types/subscriptions.ts";
import { RequestQueue } from "./requestQueue.ts";

export const fetchResourceGroupsKey = "fetch_resourcegroups";
export const fetchSubscriptionsKey = "fetch_subscriptions";
export const fetchKeyvaultsKey = "fetch_keyvaults";
export const fetchSecretsKey = "fetch_secrets";
export const createKeyvaultKey = "create_keyvault";

export async function fetchResourceGroups(subscriptionId: string): Promise<ResourceGroup[]> {
  try {
    return await invoke<ResourceGroup[]>("get_resource_groups", { subscriptionId });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Failed to fetch resource groups:", errorMessage);
    return [];
  }
}

export async function fetchSubscriptions(): Promise<Subscription[]> {
  try {
    return await invoke<Subscription[]>("fetch_subscriptions");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Failed to fetch subscriptions:", errorMessage);
    return [];
  }
}

export async function fetchKeyVaults(subscriptionId: string): Promise<KeyVault[]> {
  try {
    return await invoke<KeyVault[]>("fetch_keyvaults", { subscriptionId });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Failed to fetch key vaults for subscription ${subscriptionId}:`, errorMessage);
    return [];
  }
}

export async function createKeyvault(
  subscriptionId: string,
  resourceGroup: string,
  keyvaultName: string,
): Promise<KeyVault | null> {
  try {
    return await invoke<KeyVault>("create_keyvault", {
      subscriptionId,
      resourceGroup,
      keyvaultName,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(
      `Failed to create keyvault ${keyvaultName} in resource group ${resourceGroup}:`,
      errorMessage,
    );
    throw new Error(errorMessage);
  }
}

export async function checkKeyvaultAccess(keyvaultUri: string): Promise<KeyVaultAccess | null> {
  try {
    return await invoke<KeyVaultAccess>("check_keyvault_access", { keyvaultUri });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Failed to check keyvault access for keyvault ${keyvaultUri}:`, errorMessage);
    return null;
  }
}

export async function fetchSecrets(keyvaultUri: string): Promise<Secret[]> {
  try {
    return await invoke("get_secrets", { keyvaultUri });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Failed to fetch secrets for keyvault ${keyvaultUri}:`, errorMessage);
    return [];
  }
}

// Global request queue for secret fetching (max 10 concurrent requests)
const secretRequestQueue = new RequestQueue(10);

export async function fetchSecret(
  keyvaultUri: string,
  secretName: string,
  secretVersion: string | undefined = undefined,
  signal?: AbortSignal,
): Promise<SecretBundle | null> {
  return secretRequestQueue.add(async () => {
    // Check if already cancelled before starting
    if (signal?.aborted) {
      throw new Error("Request cancelled");
    }

    try {
      const result = await invoke<SecretBundle>("get_secret", {
        keyvaultUri,
        secretName,
        secretVersion,
      });

      // Check if cancelled after invoke
      if (signal?.aborted) {
        throw new Error("Request cancelled");
      }

      return result;
    } catch (err) {
      // Don't log cancellation errors
      if (signal?.aborted) {
        throw new Error("Request cancelled");
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(
        `Failed to fetch secret ${secretName} from keyvault ${keyvaultUri}:`,
        errorMessage,
      );
      return null;
    }
  });
}

export async function deleteSecret(keyvaultUri: string, secretName: string): Promise<Secret> {
  return await invoke("delete_secret", { keyvaultUri, secretName });
}

export async function createSecret(
  keyvaultUri: string,
  secretName: string,
  secretValue: string,
): Promise<SecretBundle> {
  try {
    console.log(`Creating secret ${secretName} in keyvault ${keyvaultUri}...`);
    return await invoke<SecretBundle>("create_secret", { keyvaultUri, secretName, secretValue });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(
      `Failed to create secret ${secretName} for keyvault ${keyvaultUri}:`,
      errorMessage,
    );
    throw new Error(errorMessage);
  }
}

export async function updateSecret(
  keyvaultUri: string,
  secretName: string,
  secretValue: string,
): Promise<SecretBundle> {
  try {
    console.log(`Updating secret ${secretName} in keyvault ${keyvaultUri}...`);
    return await invoke<SecretBundle>("update_secret", { keyvaultUri, secretName, secretValue });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(
      `Failed to update secret ${secretName} for keyvault ${keyvaultUri}:`,
      errorMessage,
    );
    throw new Error(errorMessage);
  }
}

export interface ExportOptions {
  format: "full" | "simple" | "keyValue" | "dotenv";
  includeValue: boolean;
  includeEnabled: boolean;
  includeCreated: boolean;
  includeUpdated: boolean;
  includeRecoveryLevel: boolean;
}

export async function exportSecrets(
  vaultName: string,
  vaultUri: string,
  options: ExportOptions,
): Promise<string> {
  return await invoke<string>("export_secrets", { vaultName, vaultUri, options });
}

export interface ImportedSecret {
  name: string;
  value: string;
}

export async function parseImportFile(content: string, format?: string): Promise<ImportedSecret[]> {
  return await invoke<ImportedSecret[]>("parse_import_file", { content, format });
}
