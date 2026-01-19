import {createFileRoute, Link} from '@tanstack/react-router'
import {PageHeader} from '../components/PageHeader'
import {ArrowLeftIcon} from '../components/icons'
import {Suspense, useState, useMemo} from 'react'
import {LoadingSpinner} from '../components/LoadingSpinner'
import {fetchSecrets, fetchSecretsKey} from '../services/azureService'
import {SecretCard} from '../components/SecretCard'
import {useSuspenseQuery} from '@tanstack/react-query'

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
  const [searchQuery, setSearchQuery] = useState('')

  // Use React Query to fetch secrets list
  const { data: secrets } = useSuspenseQuery({
    queryKey: [fetchSecretsKey, vaultUri],
    queryFn: () => fetchSecrets(vaultUri),
  })

  // Helper function to extract secret name from ID
  const getSecretName = (id: string) => {
    const parts = id.split('/')
    return parts[parts.length - 1]
  }

  // Filter secrets based on search query
  // Note: Individual secret values are fetched by SecretCard components using React Query
  const filteredSecrets = useMemo(() => {
    return secrets.filter(secret => {
      if (!searchQuery) return true

      const query = searchQuery.toLowerCase()
      const secretName = getSecretName(secret.id).toLowerCase()

      // Basic name filtering - value filtering happens in SecretCard after values are loaded
      return secretName.includes(query)
    })
  }, [secrets, searchQuery])

  return (
    <Suspense fallback={<SecretsLoadingSpinner/>}>
      <div className="h-full px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <PageHeader>{name}</PageHeader>

          <div className="card mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Secrets
            </h2>

            {secrets.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Search secrets by name or value..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Found {filteredSecrets.length} of {secrets.length} secret{secrets.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {secrets.length > 5 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  ℹ️ Secret values are loaded progressively (max 25 concurrent requests) to maintain performance.
                </p>
              </div>
            )}

            {secrets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  No secrets found in this Key Vault
                </p>
              </div>
            ) : filteredSecrets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  No secrets match your search query "{searchQuery}"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSecrets.map((secret) => (
                  <SecretCard
                    key={secret.id}
                    secret={secret}
                    vaultUri={vaultUri}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/subscriptions"
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

