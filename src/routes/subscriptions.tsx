import {createFileRoute} from '@tanstack/react-router'
import {PageHeader} from '../components/PageHeader'
import {Suspense, useState, useMemo, useEffect, useRef} from 'react'
import {fetchSubscriptions, fetchSubscriptionsKey, fetchKeyVaults, fetchKeyvaultsKey, createKeyvault} from '../services/azureService'
import {LoadingSpinner} from '../components/LoadingSpinner'
import {KeyvaultsList} from '../components/KeyvaultsList.tsx'
import { useSuspenseQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import {Subscription} from "~/types/subscriptions.ts";
import {CreateKeyvaultModal} from '../components/CreateKeyvaultModal'
import {useToast} from '../contexts/ToastContext'
import {PlusIcon} from 'lucide-react'

const subscriptionQueryOptions = { queryKey: [fetchSubscriptionsKey], queryFn: fetchSubscriptions }

type SubscriptionsSearch = {
  subscriptionId?: string
}

export const Route = createFileRoute('/subscriptions')({
  component: Subscriptions,
  pendingComponent: VaultsLoadingSpinner,
  errorComponent: VaultsError,
  validateSearch: (search: Record<string, unknown>): SubscriptionsSearch => {
    return {
      subscriptionId: search.subscriptionId as string | undefined,
    }
  },
  loader: async ({
    context: { queryClient },
  }) => {
    // Fetch subscriptions and prefetch key vaults in the background
    // We don't await the key vault queries so the UI shows immediately
    queryClient.prefetchQuery(subscriptionQueryOptions).then((subscriptions) => {
      // Prefetch key vaults for all subscriptions in parallel (non-blocking)
      // TODO@JOREN: do some proper type mapping
      (subscriptions as unknown as Subscription[]).forEach((sub) => {
        queryClient.prefetchQuery({
          queryKey: [fetchKeyvaultsKey, sub.subscriptionId],
          queryFn: () => fetchKeyVaults(sub.subscriptionId),
        });
      });
    });
  },
})

function VaultsLoadingSpinner() {
  return (
    <div className="h-full flex items-center justify-center p-10">
      <LoadingSpinner size="md"/>
    </div>
  )
}

function Subscriptions() {
  const { subscriptionId: urlSubscriptionId } = Route.useSearch()
  const subscriptions = useSuspenseQuery(subscriptionQueryOptions).data || [];
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Fetch all key vaults for all subscriptions
  const keyvaultQueries = useQueries({
    queries: subscriptions.map((sub) => ({
      queryKey: [fetchKeyvaultsKey, sub.subscriptionId],
      queryFn: () => fetchKeyVaults(sub.subscriptionId)
    })),
  });

  // Check if all queries are loaded
  const allQueriesLoaded = keyvaultQueries.every(query => query.isSuccess || query.isError);
  const anyQueriesLoading = keyvaultQueries.some(query => query.isLoading);

  // Create a map of subscription ID to key vault count and loading state
  const keyvaultCounts = useMemo(() => {
    const counts = new Map<string, number>();
    subscriptions.forEach((sub, index) => {
      const data = keyvaultQueries[index]?.data || [];
      counts.set(sub.subscriptionId, data.length);
    });
    return counts;
  }, [subscriptions, keyvaultQueries]);

  const keyvaultLoadingStates = useMemo(() => {
    const states = new Map<string, boolean>();
    subscriptions.forEach((sub, index) => {
      states.set(sub.subscriptionId, keyvaultQueries[index]?.isLoading || false);
    });
    return states;
  }, [subscriptions, keyvaultQueries]);

  const defaultSubscriptionId = useMemo(() =>
    urlSubscriptionId || subscriptions[0]?.subscriptionId,
    [urlSubscriptionId, subscriptions]
  );

  const [selectedSubscription, setSelectedSubscription] = useState<string | undefined>(defaultSubscriptionId)

  // Track if we've done the initial setup
  const isInitialMount = useRef(true);
  const prevUrlSubscriptionIdRef = useRef(urlSubscriptionId);

  // Update selected subscription when URL parameter changes
  useEffect(() => {
    // On initial mount, set the default
    if (isInitialMount.current) {
      if (defaultSubscriptionId) {
        setSelectedSubscription(defaultSubscriptionId);
      }
      isInitialMount.current = false;
      prevUrlSubscriptionIdRef.current = urlSubscriptionId;
    }
    // If URL subscription changed, update to it
    else if (urlSubscriptionId && urlSubscriptionId !== prevUrlSubscriptionIdRef.current) {
      setSelectedSubscription(urlSubscriptionId);
      prevUrlSubscriptionIdRef.current = urlSubscriptionId;
    }
  }, [urlSubscriptionId, defaultSubscriptionId])

  const selectedSubscriptionName = useMemo(() => {
    return subscriptions.find(s => s.subscriptionId === selectedSubscription)?.displayName || 'Select subscription'
  }, [subscriptions, selectedSubscription])

  // Mutation for creating a new key vault
  const createKeyvaultMutation = useMutation({
    mutationFn: ({ resourceGroup, keyvaultName }: { resourceGroup: string; keyvaultName: string }) => {
      if (!selectedSubscription) throw new Error('No subscription selected')
      return createKeyvault(selectedSubscription, resourceGroup, keyvaultName)
    },
    onSuccess: (keyvault) => {
      // Invalidate and refetch keyvaults list for the selected subscription
      queryClient.invalidateQueries({ queryKey: [fetchKeyvaultsKey, selectedSubscription] })
      setShowCreateModal(false)
      showSuccess(`Key Vault "${keyvault?.name}" created successfully`)
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Failed to create key vault:', errorMsg)
      showError('Failed to create Key Vault', errorMsg)
    }
  })

  const handleCreateKeyvault = (resourceGroup: string, keyvaultName: string) => {
    createKeyvaultMutation.mutate({ resourceGroup, keyvaultName })
  }

  return (
    <Suspense fallback={<VaultsLoadingSpinner/>}>
      <div className="h-full px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <PageHeader>Azure Key Vaults</PageHeader>

            {/* Subscription Dropdown Selector */}
            {subscriptions.length > 0 && (
              <div className="flex items-center gap-3">
                <label htmlFor="subscription-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subscription:
                </label>
                <select
                  id="subscription-select"
                  value={selectedSubscription || ''}
                  onChange={(e) => setSelectedSubscription(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 min-w-[300px]"
                >
                  {subscriptions.map((sub) => {
                    const count = keyvaultCounts.get(sub.subscriptionId) || 0;
                    const isLoading = keyvaultLoadingStates.get(sub.subscriptionId) || false;

                    return (
                      <option
                        key={sub.subscriptionId}
                        value={sub.subscriptionId}
                      >
                        {isLoading ? '⏳' : count > 0 ? '✓' : '○'} {sub.displayName} {isLoading ? '(loading...)' : `(${count} ${count === 1 ? 'vault' : 'vaults'})`}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Key Vaults in {selectedSubscriptionName}
              </h2>
              {selectedSubscription && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  title="Create new Key Vault"
                >
                  <PlusIcon className="w-4 h-4" />
                  Create Key Vault
                </button>
              )}
            </div>

            {anyQueriesLoading && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Loading key vaults for all subscriptions...
                </p>
              </div>
            )}

            {allQueriesLoaded && selectedSubscription && keyvaultCounts.get(selectedSubscription) === 0 && (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  ⚠️ No Key Vaults found in this subscription. You can create a new Key Vault using the button above, or this could be due to:
                </p>
                <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-400 list-disc list-inside space-y-1">
                  <li>Insufficient permissions to access Key Vaults</li>
                  <li>Network or firewall restrictions</li>
                </ul>
              </div>
            )}

            {selectedSubscription &&
                <KeyvaultsList
                    subscriptionId={selectedSubscription}
                />
            }
          </div>
        </div>
      </div>

      {/* Create Key Vault Modal */}
      {selectedSubscription && (
        <CreateKeyvaultModal
          isOpen={showCreateModal}
          onConfirm={handleCreateKeyvault}
          onCancel={() => setShowCreateModal(false)}
          subscriptionId={selectedSubscription}
          subscriptionName={selectedSubscriptionName}
          isCreating={createKeyvaultMutation.isPending}
        />
      )}
    </Suspense>

  )
}

function VaultsError({error}: { error: Error }) {
  return (
    <div className="h-full flex items-center justify-center px-4">
      <div
        className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          Something went wrong
        </h2>

        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          {error.message}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Retry
        </button>

        {/*<button*/}
        {/*  type="button"*/}
        {/*  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"*/}
        {/*  onClick={() => router.invalidate()}>*/}
        {/*  Retry*/}
        {/*</button>*/}
      </div>
    </div>
  )
}

