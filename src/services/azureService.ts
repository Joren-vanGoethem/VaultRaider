import { invoke } from '@tauri-apps/api/core';
import type { Subscription, KeyVault } from '../types/azure';

export async function fetchSubscriptions(): Promise<Subscription[]> {
  return await invoke<Subscription[]>('fetch_subscriptions');
}

export async function fetchKeyVaults(subscriptionId: string): Promise<KeyVault[]> {
  return await invoke<KeyVault[]>('fetch_keyvaults', { subscriptionId });
}
