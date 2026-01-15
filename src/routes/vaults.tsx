import {createFileRoute, Link} from '@tanstack/react-router'
import {PageHeader} from '../components/PageHeader'
import {ArrowLeftIcon} from '../components/icons'
import {Suspense, useState, useEffect, startTransition} from 'react'
import {fetchSubscriptions, fetchKeyVaults} from '../services/azureService'
import {LoadingSpinner} from '../components/LoadingSpinner'

// Note: For production use, you can add zod for search param validation
// npm install zod
// import { z } from 'zod'
// Then add: validateSearch: z.object({ filter: z.string().optional(), page: z.number().optional() })

interface SearchParams {
  filter?: string;
  page?: number;
}

export const Route = createFileRoute('/vaults')({
  component: Vaults,
  errorComponent: VaultsError,
  loader: async () => {
    const subscriptions = await fetchSubscriptions()
    const defaultSubscriptionId = subscriptions[0]?.subscriptionId

    // Fetch key vaults for the first subscription immediately
    const keyVaults = defaultSubscriptionId
      ? await fetchKeyVaults(defaultSubscriptionId)
      : []

    return {
      subscriptions,
      defaultSubscriptionId,
      initialKeyVaults: keyVaults
    }
  },
})

function VaultsLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="md"/>
    </div>
  )
}

function Vaults() {
  console.log("render");
  const searchParams = Route.useSearch() as SearchParams
  const { subscriptions, defaultSubscriptionId, initialKeyVaults } = Route.useLoaderData()

  // Initialize with loader data to prevent unnecessary re-renders
  const [selectedSubscription, setSelectedSubscription] = useState(defaultSubscriptionId)
  const [keyVaults, setKeyVaults] = useState(initialKeyVaults)

  useEffect(() => {
    // Skip if this is the initial subscription (already loaded)
    if (selectedSubscription === defaultSubscriptionId) {
      return
    }

    console.log("useEffect - fetching for new subscription");
    if (selectedSubscription != null) {
      fetchKeyVaults(selectedSubscription).then((vaults) => {
        startTransition(() => {
          setKeyVaults(vaults)
        })
      })
    }
  }, [selectedSubscription, defaultSubscriptionId])

  const filter = searchParams.filter || 'all'
  const page = Number(searchParams.page) || 1

  return (
    <Suspense fallback={<VaultsLoadingSpinner/>}>

      <div className="min-h-screen px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <PageHeader>Azure Key Vaults</PageHeader>

          <div className="card">
            <div className="mb-6">
              <label htmlFor="subscription-select"
                     className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Subscription
              </label>
              <select
                id="subscription-select"
                value={selectedSubscription ?? undefined}
                onChange={(e) => setSelectedSubscription(e.target.value)}
                className="w-full p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              >
                {subscriptions?.map((sub) => (
                  <option key={sub.id} value={sub.subscriptionId}>
                    {sub.displayName} ({sub.subscriptionId})
                  </option>
                ))}
              </select>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Key Vaults
            </h2>

            {keyVaults?.length ?? 0 > 0 ? (
              <div className="grid gap-4">
                {keyVaults?.map((vault) => (
                  <div key={vault.id}
                       className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{vault.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{vault.location}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-xs font-mono text-gray-500 dark:text-gray-500">{vault.properties.vaultUri}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No Key Vaults found in this subscription.
              </div>
            )}

            {/*<div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-6">*/}
            {/*  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">*/}
            {/*    <div>*/}
            {/*      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Filter</p>*/}
            {/*      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">{filter}</p>*/}
            {/*    </div>*/}
            {/*    <div>*/}
            {/*      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Page</p>*/}
            {/*      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{page}</p>*/}
            {/*    </div>*/}
            {/*  </div>*/}
            {/*</div>*/}
          </div>

          <div
            className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span className="font-semibold">Current URL:</span> /vaults?filter={filter}&page={page}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This demonstrates search params (query parameters) in TanStack Router
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
            >
              <ArrowLeftIcon/>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </Suspense>

  )
}

function VaultsError({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          Something went wrong
        </h2>

        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          {error.message}
        </p>

        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Retry
        </button>

        {/*<button onClick={() => router.invalidate()}>*/}
        {/*  Retry*/}
        {/*</button>*/}
      </div>
    </div>
  )
}

