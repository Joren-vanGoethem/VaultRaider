import {invoke} from '@tauri-apps/api/core';
import type {Subscription} from "~/types/subscriptions.ts";
import {KeyVault, KeyVaultAccess} from "~/types/keyvault.ts";
import {Secret, SecretBundle} from "~/types/secrets.ts";
import {RequestQueue} from "./requestQueue.ts";

export const fetchSubscriptionsKey = 'fetch_subscriptions';
export const fetchKeyvaultsKey = 'fetch_keyvaults';
export const fetchSecretsKey = 'fetch_secrets';

export async function fetchSubscriptions(): Promise<Subscription[]> {
  try {
    return await invoke<Subscription[]>('fetch_subscriptions');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('Failed to fetch subscriptions:', errorMessage)
    return []
  }
}

export async function fetchKeyVaults(subscriptionId: string): Promise<KeyVault[]> {
  try {
    return await invoke<KeyVault[]>('fetch_keyvaults', {subscriptionId});
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Failed to fetch key vaults for subscription ${subscriptionId}:`, errorMessage)
    return [];
  }
}

export async function checkKeyvaultAccess(keyvaultUri: string): Promise<KeyVaultAccess | null> {
  try {
    return await invoke<KeyVaultAccess>('check_keyvault_access', {keyvaultUri});
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Failed to check keyvault access for keyvault ${keyvaultUri}:`, errorMessage)
    return null;
  }
}

export async function fetchSecrets(keyvaultUri: string): Promise<Secret[]> {
  try {
    return await invoke('get_secrets', {keyvaultUri});
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Failed to fetch secrets for keyvault ${keyvaultUri}:`, errorMessage)
    return [];
  }
}

// Global request queue for secret fetching (max 10 concurrent requests)
const secretRequestQueue = new RequestQueue(10);

export async function fetchSecret(
  keyvaultUri: string,
  secretName: string,
  secretVersion: string | undefined = undefined,
  signal?: AbortSignal
): Promise<SecretBundle | null> {
  return secretRequestQueue.add(async () => {
    // Check if already cancelled before starting
    if (signal?.aborted) {
      throw new Error('Request cancelled');
    }

    try {
      const result = await invoke<SecretBundle>('get_secret', {keyvaultUri, secretName, secretVersion});

      // Check if cancelled after invoke
      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }

      return result;
    } catch (err) {
      // Don't log cancellation errors
      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }

      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`Failed to fetch secret ${secretName} from keyvault ${keyvaultUri}:`, errorMessage)
      return null;
    }
  });
}


export async function deleteSecret(keyvaultUri: string, secretName: string): Promise<Secret> {
  return await invoke('delete_secret', {keyvaultUri, secretName});
}

export async function createSecret(keyvaultUri: string, secretName: string, secretValue: string): Promise<SecretBundle[]> {
  try {
    console.log(`Creating secret ${secretName} with value ${secretValue} in keyvault ${keyvaultUri}...`);
    return await invoke('create_secret', {keyvaultUri, secretName, secretValue});
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Failed to create secret ${secretName} for keyvault ${keyvaultUri}:`, errorMessage)
    return [];
  }
}

export async function updateSecret(keyvaultUri: string, secretName: string, secretValue: string): Promise<SecretBundle[]> {
  try {
    console.log(`Updating secret ${secretName} with value ${secretValue} in keyvault ${keyvaultUri}...`);
    return await invoke('update_secret', {keyvaultUri, secretName, secretValue});
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Failed to update secret ${secretName} for keyvault ${keyvaultUri}:`, errorMessage)
    return [];
  }
}
