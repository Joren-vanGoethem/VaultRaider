import {createFileRoute} from '@tanstack/react-router'
import {Suspense, useState, useMemo, useRef} from 'react'
import {LoadingSpinner} from '../components/LoadingSpinner'
import {fetchSecrets, fetchSecretsKey, createSecret} from '../services/azureService'
import {SecretCard} from '../components/SecretCard'
import {ExportSecretsModal} from '../components/ExportSecretsModal'
import {useSuspenseQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {PlusIcon, DownloadIcon, UploadIcon, FileJsonIcon, GitCompareIcon, SearchIcon, XIcon, KeyIcon} from 'lucide-react'
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
  const { vaultUri, name } = Route.useSearch()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [newSecretName, setNewSecretName] = useState('')
  const [newSecretValue, setNewSecretValue] = useState('')
  const [importJson, setImportJson] = useState('')
  const [loadAll, setLoadAll] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  // Handle file input for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setImportJson(content)
        setShowImportModal(true)
      }
      reader.readAsText(file)
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Import secrets from JSON
  const handleImportJson = async () => {
    try {
      const data = JSON.parse(importJson)
      const secretsToImport = data.secrets || data

      if (!Array.isArray(secretsToImport)) {
        throw new Error('Invalid JSON format. Expected an array of secrets or an object with a "secrets" array.')
      }

      let successCount = 0
      let errorCount = 0

      for (const secret of secretsToImport) {
        const secretName = secret.name || secret.key
        const secretValue = secret.value

        if (!secretName || !secretValue) {
          errorCount++
          continue
        }

        try {
          await createSecret(vaultUri, secretName, secretValue)
          successCount++
        } catch {
          errorCount++
        }
      }

      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] })
      setShowImportModal(false)
      setImportJson('')

      if (successCount > 0) {
        showSuccess(`Imported ${successCount} secrets successfully${errorCount > 0 ? ` (${errorCount} failed)` : ''}`)
      } else {
        showError('Import failed', 'No secrets were imported')
      }
    } catch (error) {
      showError('Import failed', error instanceof Error ? error.message : 'Invalid JSON format')
    }
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
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <KeyIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{secrets.length} secret{secrets.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {secrets.length > 0 && !loadAll && (
                <button
                  type="button"
                  onClick={handleLoadAll}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title="Load all secret values"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Load All
                </button>
              )}

              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                disabled={secrets.length === 0}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export secrets to JSON"
              >
                <FileJsonIcon className="w-4 h-4" />
                Export
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="Import secrets from JSON"
              >
                <UploadIcon className="w-4 h-4" />
                Import
              </button>

              <button
                type="button"
                onClick={() => setShowCompareModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="Compare with another vault"
              >
                <GitCompareIcon className="w-4 h-4" />
                Compare
              </button>

              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

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
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Search Bar */}
          {secrets.length > 0 && (
            <div className="mb-4">
              <div className="relative max-w-xl">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search secrets by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Clear search"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredSecrets.length} of {secrets.length} secret{secrets.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Info Banner */}
          {secrets.length > 0 && !loadAll && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-xl">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                ℹ️ Secret values are loaded on demand. Click "Load Value" on individual secrets or "Load All" to fetch them.
              </p>
            </div>
          )}

          {/* Secrets Grid/List */}
          {secrets.length === 0 ? (
            <div className="text-center py-12">
              <KeyIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No secrets found in this Key Vault
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                Click "Add Secret" to create your first secret
              </p>
            </div>
          ) : filteredSecrets.length === 0 ? (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No secrets match "{searchQuery}"
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
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
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

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowImportModal(false); setImportJson(''); }}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Import Secrets from JSON
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Paste JSON containing secrets to import. Expected format:
                </p>
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-gray-700 dark:text-gray-300 overflow-auto">
{`{
  "secrets": [
    { "name": "secret-name", "value": "secret-value" },
    ...
  ]
}`}
                </pre>
              </div>
              <div className="mb-6">
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                  placeholder="Paste your JSON here..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setImportJson(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportJson}
                  disabled={!importJson.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import Secrets
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compare Modal (Placeholder) */}
        {showCompareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCompareModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Compare with Another Vault
              </h3>
              <div className="text-center py-8">
                <GitCompareIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Compare functionality coming soon!
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  This feature will allow you to compare secrets between vaults, identify missing keys, and sync configurations.
                </p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowCompareModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
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

