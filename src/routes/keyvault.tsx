import {createFileRoute, Link} from '@tanstack/react-router'
import {PageHeader} from '../components/PageHeader'
import {ArrowLeftIcon} from '../components/icons'
import {Suspense, useState, useMemo} from 'react'
import {LoadingSpinner} from '../components/LoadingSpinner'
import {fetchSecrets, fetchSecretsKey, createSecret} from '../services/azureService'
import {SecretCard} from '../components/SecretCard'
import {useSuspenseQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {PlusIcon, DownloadIcon} from 'lucide-react'
import {useToast} from '../contexts/ToastContext'

type KeyvaultSearch = {
  vaultUri: string
  name: string
  subscriptionId?: string
}

export const Route = createFileRoute('/keyvault')({
  component: Keyvaults,
  pendingComponent: SecretsLoadingSpinner,
  errorComponent: SecretsError,
  validateSearch: (search: Record<string, unknown>): KeyvaultSearch => {
    return {
      vaultUri: search.vaultUri as string,
      name: search.name as string,
      subscriptionId: search.subscriptionId as string | undefined,
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
  const { vaultUri, name, subscriptionId } = Route.useSearch()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSecretName, setNewSecretName] = useState('')
  const [newSecretValue, setNewSecretValue] = useState('')
  const [loadAll, setLoadAll] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  // Use React Query to fetch secrets list
  const { data: secrets } = useSuspenseQuery({
    queryKey: [fetchSecretsKey, vaultUri],
    queryFn: () => fetchSecrets(vaultUri),
  })

  // Mutation for creating a new secret
  const createMutation = useMutation({
    mutationFn: () => createSecret(vaultUri, newSecretName, newSecretValue),
    onSuccess: () => {
      // Invalidate and refetch secrets list
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] })
      setShowCreateModal(false)
      setNewSecretName('')
      setNewSecretValue('')
      showSuccess(`Secret "${newSecretName}" created successfully`)
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Failed to create secret:', errorMsg)
      showError('Failed to create secret', errorMsg)
    }
  })

  const handleCreateClick = () => {
    setShowCreateModal(true)
  }

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSecretName.trim() || !newSecretValue.trim()) {
      alert('Secret name and value are required')
      return
    }
    createMutation.mutate()
  }

  const handleCancelCreate = () => {
    setShowCreateModal(false)
    setNewSecretName('')
    setNewSecretValue('')
  }

  const handleLoadAll = () => {
    setLoadAll(true)
  }

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
          <div className="flex items-center justify-start gap-10">
            <Link
              to="/subscriptions"
              search={subscriptionId ? { subscriptionId } : undefined}
              className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
            >
              <ArrowLeftIcon/>
              Back to Vaults
            </Link>
            <PageHeader>{name}</PageHeader>
          </div>

          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Secrets
              </h2>
              <div className="flex gap-2">
                {secrets.length > 0 && !loadAll && (
                  <button
                    type="button"
                    onClick={handleLoadAll}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    title="Load all secret values"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Load All Values
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  title="Add new secret"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Secret
                </button>
              </div>
            </div>

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

            {secrets.length > 0 && !loadAll && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  ℹ️ Secret values are not loaded by default. Click "Load Value" on individual secrets or "Load All Values" to fetch them.
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
              <div className="space-y-2">
                {filteredSecrets.map((secret) => (
                  <SecretCard
                    key={secret.id}
                    secret={secret}
                    vaultUri={vaultUri}
                    searchQuery={searchQuery}
                    shouldLoad={loadAll}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 text-center">

          </div>
        </div>

        {/* Create Secret Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancelCreate}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Create New Secret
              </h3>
              <form onSubmit={handleConfirmCreate}>
                <div className="mb-4">
                  <label htmlFor="secretName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Secret Name
                  </label>
                  <input
                    type="text"
                    id="secretName"
                    value={newSecretName}
                    onChange={(e) => setNewSecretName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                    placeholder="my-secret-name"
                    disabled={createMutation.isPending}
                    required
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="secretValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Secret Value
                  </label>
                  <textarea
                    id="secretValue"
                    value={newSecretValue}
                    onChange={(e) => setNewSecretValue(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent resize-none"
                    placeholder="Enter secret value..."
                    disabled={createMutation.isPending}
                    required
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelCreate}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Secret'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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

