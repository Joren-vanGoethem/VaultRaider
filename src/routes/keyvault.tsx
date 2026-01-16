import {createFileRoute, Link} from '@tanstack/react-router'
import {PageHeader} from '../components/PageHeader'
import {ArrowLeftIcon} from '../components/icons'
import {Suspense, useEffect} from 'react'
import {LoadingSpinner} from '../components/LoadingSpinner'
import {fetchSecrets} from '../services/azureService'

type KeyvaultSearch = {
  vaultUri: string
  name: string
}

export const Route = createFileRoute('/keyvault')({
  component: Keyvaults,
  pendingComponent: SecretsLoadingSpinner,
  errorComponent: SecretsError,
  validateSearch: (search: Record<string, unknown>): KeyvaultSearch => {
    return {
      vaultUri: search.vaultUri as string,
      name: search.name as string,
    }
  },
})

function SecretsLoadingSpinner() {
  return (
    <div className="h-full flex items-center justify-center">
      <LoadingSpinner size="md"/>
    </div>
  )
}

function Keyvaults() {
  const { vaultUri, name } = Route.useSearch()

  useEffect(() => {
    // Fetch secrets when component mounts or vaultUri changes
    if (vaultUri) {
      fetchSecrets(vaultUri)
    }
  }, [vaultUri])

  return (
    <Suspense fallback={<SecretsLoadingSpinner/>}>
      <div className="h-full px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <PageHeader>{name}</PageHeader>

          <div className="card mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Secrets
            </h2>

            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                Loading secrets for this Key Vault...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                (Backend implementation pending)
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/vaults"
              className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
            >
              <ArrowLeftIcon/>
              Back to Vaults
            </Link>
          </div>
        </div>
      </div>
    </Suspense>
  )
}

function SecretsError({error}: { error: Error }) {
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
      </div>
    </div>
  )
}

