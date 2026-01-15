import {createFileRoute, Link} from '@tanstack/react-router'
import {PageHeader} from '../components/PageHeader'
import {ArrowLeftIcon} from '../components/icons'
import {Suspense, useState} from 'react'
import {fetchSubscriptions, fetchSubscriptionsKey} from '../services/azureService'
import {LoadingSpinner} from '../components/LoadingSpinner'
import {SubscriptionSelector} from '../components/SubscriptionSelector'
import {KeyVaultsList} from '../components/KeyVaultsList'
import { useSuspenseQuery} from "@tanstack/react-query";

const subscriptionQueryOptions = { queryKey: [fetchSubscriptionsKey], queryFn: fetchSubscriptions }

export const Route = createFileRoute('/vaults')({
  component: Vaults,
  pendingComponent: VaultsLoadingSpinner,
  errorComponent: VaultsError,
  // beforeLoad: () => {
  //   return {
  //     subscriptionQueryOptions: subscriptionQueryOptions
  //   }
  // },
  loader: ({
    context: { queryClient },
    // routeContext: { subscriptionQueryOptions },
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

function Vaults() {
  const subscriptions = useSuspenseQuery(subscriptionQueryOptions).data || [];
  const defaultSubscriptionId = subscriptions[0]?.subscriptionId;

  const [selectedSubscription, setSelectedSubscription] = useState(defaultSubscriptionId)

  return (
    <Suspense fallback={<VaultsLoadingSpinner/>}>
      <div className="h-full px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <PageHeader>Azure Key Vaults</PageHeader>

          <div className="card">
            <SubscriptionSelector
              subscriptions={subscriptions}
              selectedSubscription={selectedSubscription}
              onSubscriptionChange={setSelectedSubscription}
            />

            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Key Vaults
            </h2>

            {selectedSubscription &&
                <KeyVaultsList
                    subscriptionId={selectedSubscription}
                />
            }
          </div>

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

