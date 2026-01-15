import {invoke} from '@tauri-apps/api/core';
import type {Subscription, KeyVault} from '../types/azure';
import {QueryClient} from "@tanstack/react-query";

export const fetchSubscriptionsKey = 'fetch_subscriptions';
export const fetchKeyVaultsKey = 'fetch_keyvaults';

export async function fetchSubscriptions(): Promise<Subscription[]> {
  try {
    return await invoke<Subscription[]>('fetch_subscriptions');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('Failed to fetch subscriptions:', errorMessage)
    return []
  }
}

export const prefetchSubscriptions = (queryClient: QueryClient) => {
  queryClient.prefetchQuery({
    queryKey: [fetchSubscriptions],
    queryFn: fetchSubscriptions
  })
}


export async function fetchKeyVaults(subscriptionId: string): Promise<KeyVault[]> {
  try {
    console.log(`Fetching key vaults for subscription ${subscriptionId}`)
    return await invoke<KeyVault[]>('fetch_keyvaults', {subscriptionId});
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Failed to fetch key vaults for subscription ${subscriptionId}:`, errorMessage)
    return [];
  }
}
