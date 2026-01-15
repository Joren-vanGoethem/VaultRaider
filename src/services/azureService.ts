import {invoke} from '@tauri-apps/api/core';
import type {Subscription, KeyVault} from '../types/azure';

export async function fetchSubscriptions(): Promise<Subscription[]> {
  try {
    return await invoke<Subscription[]>('fetch_subscriptions');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('Failed to fetch subscriptions:', errorMessage)
    throw new Error(`Failed to fetch subscriptions: ${errorMessage}`)
  }
}

export async function fetchKeyVaults(subscriptionId: string): Promise<KeyVault[]> {
  try {
    return await invoke<KeyVault[]>('fetch_keyvaults', {subscriptionId});
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Failed to fetch key vaults for subscription ${subscriptionId}:`, errorMessage)

    // If it's an authorization error, return empty array instead of throwing
    // This prevents infinite loops when the user doesn't have permissions
    if (errorMessage.includes('AuthorizationFailed') || errorMessage.includes('authorization')) {
      console.warn('Authorization failed - returning empty array')
      return []
    }

    throw new Error(`Failed to fetch key vaults: ${errorMessage}`)
  }
}
