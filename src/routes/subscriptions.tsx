import {createFileRoute} from '@tanstack/react-router'
import {PageHeader} from '../components/PageHeader'
import {Suspense, useState, useMemo, useEffect} from 'react'
import {fetchSubscriptions, fetchSubscriptionsKey} from '../services/azureService'
import {LoadingSpinner} from '../components/LoadingSpinner'
import {KeyvaultsList} from '../components/KeyvaultsList.tsx'
import { useSuspenseQuery} from "@tanstack/react-query";

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
  loader: ({
    context: { queryClient },
  }) => {
    queryClient.prefetchQuery(subscriptionQueryOptions)
  },
})

function VaultsLoadingSpinner() {
  return (
    <div className="h-full flex items-center justify-center">
      <LoadingSpinner size="md"/>
    </div>
  )
}

function Subscriptions() {
  const { subscriptionId: urlSubscriptionId } = Route.useSearch()
  const subscriptions = useSuspenseQuery(subscriptionQueryOptions).data || [];
  const defaultSubscriptionId = useMemo(() =>
    urlSubscriptionId || subscriptions[0]?.subscriptionId,
    [urlSubscriptionId, subscriptions]
  );

  const [selectedSubscription, setSelectedSubscription] = useState<string | undefined>(defaultSubscriptionId)

  // Set the default subscription when subscriptions load or URL changes
  useEffect(() => {
    if (defaultSubscriptionId && defaultSubscriptionId !== selectedSubscription) {
      setSelectedSubscription(defaultSubscriptionId)
    }
  }, [defaultSubscriptionId, selectedSubscription])

  const selectedSubscriptionName = useMemo(() => {
    return subscriptions.find(s => s.subscriptionId === selectedSubscription)?.displayName || 'Select subscription'
  }, [subscriptions, selectedSubscription])

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
                  {subscriptions.map((sub) => (
                    <option key={sub.subscriptionId} value={sub.subscriptionId}>
                      {sub.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Key Vaults in {selectedSubscriptionName}
            </h2>

            {selectedSubscription &&
                <KeyvaultsList
                    subscriptionId={selectedSubscription}
                />
            }
          </div>
        </div>
      </div>
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

