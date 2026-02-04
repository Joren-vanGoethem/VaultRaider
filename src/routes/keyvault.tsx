import {createFileRoute} from '@tanstack/react-router'
import {Suspense, useState, useMemo} from 'react'
import {LoadingSpinner} from '../components/LoadingSpinner'
import {fetchSecrets, fetchSecretsKey, createSecret} from '../services/azureService'
import {ExportSecretsModal} from '../components/ExportSecretsModal'
import {ImportSecretsModal} from '../components/ImportSecretsModal'
import {KeyvaultHeader} from '../components/KeyvaultHeader'
import {KeyvaultSearchBar} from '../components/KeyvaultSearchBar'
import {SecretsEmptyState} from '../components/SecretsEmptyState'
import {SecretsList} from '../components/SecretsList'
import {CreateSecretModal} from '../components/CreateSecretModal'
import {CompareVaultsModal} from '../components/CompareVaultsModal'
import {useSuspenseQuery, useMutation, useQueryClient} from '@tanstack/react-query'
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
    <div className="h-full flex items-center justify-center p-10">
      <LoadingSpinner size="md"/>
    </div>
  )
}

function Keyvaults() {
  const {vaultUri, name, subscriptionId} = Route.useSearch()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [loadAll, setLoadAll] = useState(false)
  const queryClient = useQueryClient()
  const {showSuccess, showError} = useToast()

  // Use React Query to fetch secrets list
  const {data: secrets} = useSuspenseQuery({
    queryKey: [fetchSecretsKey, vaultUri],
    queryFn: () => fetchSecrets(vaultUri),
  })

  // Mutation for creating a new secret
  const createMutation = useMutation({
    mutationFn: ({name, value}: {name: string; value: string}) => createSecret(vaultUri, name, value),
    onSuccess: (_data, variables) => {
      // Invalidate and refetch secrets list
      queryClient.invalidateQueries({queryKey: [fetchSecretsKey, vaultUri]})
      setShowCreateModal(false)
      showSuccess(`Secret "${variables.name}" created successfully`)
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Failed to create secret:', errorMsg)
      showError('Failed to create secret', errorMsg)
    }
  })

  // Handler functions
  const handleConfirmCreate = (name: string, value: string) => {
    createMutation.mutate({name, value})
  }

  const handleImportComplete = () => {
    queryClient.invalidateQueries({queryKey: [fetchSecretsKey, vaultUri]})
  }

  // Helper function to extract secret name from ID
  const getSecretName = (id: string) => {
    const parts = id.split('/')
    return parts[parts.length - 1]
  }

  // Filter secrets based on search query
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
      <div className="h-full flex flex-col">
        {/* Header */}
        <KeyvaultHeader
          name={name}
          secretsCount={secrets.length}
          loadAll={loadAll}
          onLoadAll={() => setLoadAll(true)}
          onExport={() => setShowExportModal(true)}
          onImport={() => setShowImportModal(true)}
          onCompare={() => setShowCompareModal(true)}
          onCreate={() => setShowCreateModal(true)}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Search Bar */}
          {secrets.length > 0 && (
            <KeyvaultSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalCount={secrets.length}
              filteredCount={filteredSecrets.length}
            />
          )}

          {/* Secrets Grid/List */}
          {secrets.length === 0 ? (
            <SecretsEmptyState type="no-secrets" />
          ) : filteredSecrets.length === 0 ? (
            <SecretsEmptyState
              type="no-results"
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
            />
          ) : (
            <SecretsList
              secrets={filteredSecrets}
              vaultUri={vaultUri}
              searchQuery={searchQuery}
              shouldLoadAll={loadAll}
            />
          )}
        </div>

        {/* Modals */}
        <CreateSecretModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onConfirm={handleConfirmCreate}
          isCreating={createMutation.isPending}
        />

        <ImportSecretsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          vaultName={name}
          vaultUri={vaultUri}
          existingSecrets={secrets}
          onImportComplete={handleImportComplete}
        />

        <CompareVaultsModal
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
          sourceVaultUri={vaultUri}
          sourceName={name}
          sourceSubscriptionId={subscriptionId}
        />

        <ExportSecretsModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          vaultName={name}
          vaultUri={vaultUri}
          secrets={secrets}
        />
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

