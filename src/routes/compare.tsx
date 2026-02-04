import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {Suspense, useState, useMemo, useEffect} from 'react'
import {LoadingSpinner} from '../components/LoadingSpinner'
import {
  fetchSecrets,
  fetchSecretsKey,
  fetchSecret,
  createSecret,
  fetchSubscriptions,
  fetchSubscriptionsKey,
  fetchKeyVaults,
  fetchKeyvaultsKey
} from '../services/azureService'
import {useSuspenseQuery, useQuery, useMutation, useQueryClient, useQueries} from '@tanstack/react-query'
import {useToast} from '../contexts/ToastContext'
import {
  GitCompareIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  AlertTriangleIcon,
  CopyIcon,
  PlusIcon,
  RefreshCwIcon
} from 'lucide-react'
import type {Secret, SecretBundle} from '../types/secrets'

type CompareSearch = {
  sourceVaultUri: string
  sourceName: string
  targetVaultUri?: string
  targetName?: string
  sourceSubscriptionId?: string
  targetSubscriptionId?: string
}

export const Route = createFileRoute('/compare')({
  component: CompareVaults,
  pendingComponent: CompareLoadingSpinner,
  errorComponent: CompareError,
  validateSearch: (search: Record<string, unknown>): CompareSearch => {
    return {
      sourceVaultUri: search.sourceVaultUri as string,
      sourceName: search.sourceName as string,
      targetVaultUri: search.targetVaultUri as string | undefined,
      targetName: search.targetName as string | undefined,
      sourceSubscriptionId: search.sourceSubscriptionId as string | undefined,
      targetSubscriptionId: search.targetSubscriptionId as string | undefined,
    }
  },
})

function CompareLoadingSpinner() {
  return (
    <div className="h-full flex items-center justify-center p-10">
      <LoadingSpinner size="md"/>
    </div>
  )
}

// Helper function to extract secret name from ID
function getSecretName(id: string): string {
  const parts = id.split('/')
  return parts[parts.length - 1]
}

type ComparisonStatus = 'match' | 'mismatch' | 'source-only' | 'target-only'

interface ComparedSecret {
  name: string
  status: ComparisonStatus
  sourceSecret?: Secret
  targetSecret?: Secret
  sourceValue?: string
  targetValue?: string
  isLoadingSourceValue?: boolean
  isLoadingTargetValue?: boolean
}

interface CreateWithValueModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  secretName: string
  suggestedValue?: string
  isCreating: boolean
}

function CreateWithValueModal({
  isOpen,
  onClose,
  onConfirm,
  secretName,
  suggestedValue,
  isCreating
}: CreateWithValueModalProps) {
  const [value, setValue] = useState(suggestedValue || '')

  useEffect(() => {
    setValue(suggestedValue || '')
  }, [suggestedValue])

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-secret-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <h3 id="create-secret-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Create Secret: {secretName}
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="secret-value-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Secret Value
            </label>
            <textarea
              id="secret-value-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              rows={4}
              placeholder="Enter secret value..."
            />
          </div>
          {suggestedValue && (
            <button
              type="button"
              onClick={() => setValue(suggestedValue)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              Use source value
            </button>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(value)}
            disabled={!value.trim() || isCreating}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Secret'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CompareVaults() {
  const navigate = useNavigate()
  const {
    sourceVaultUri,
    sourceName,
    targetVaultUri: initialTargetVaultUri,
    targetName: initialTargetName,
    sourceSubscriptionId,
    targetSubscriptionId: initialTargetSubscriptionId
  } = Route.useSearch()

  const [targetVaultUri, setTargetVaultUri] = useState(initialTargetVaultUri || '')
  const [targetName, setTargetName] = useState(initialTargetName || '')
  const [selectedTargetSubscription, setSelectedTargetSubscription] = useState(initialTargetSubscriptionId || sourceSubscriptionId || '')
  const [loadValues, setLoadValues] = useState(false)
  const [createWithValueModal, setCreateWithValueModal] = useState<{isOpen: boolean; secretName: string; suggestedValue?: string}>({
    isOpen: false,
    secretName: '',
    suggestedValue: undefined
  })

  const queryClient = useQueryClient()
  const {showSuccess, showError} = useToast()

  // Fetch subscriptions for target vault selection
  const {data: subscriptions = []} = useSuspenseQuery({
    queryKey: [fetchSubscriptionsKey],
    queryFn: fetchSubscriptions,
  })

  // Fetch keyvaults for the selected target subscription
  const {data: targetKeyvaults = [], isLoading: loadingTargetKeyvaults} = useQuery({
    queryKey: [fetchKeyvaultsKey, selectedTargetSubscription],
    queryFn: () => fetchKeyVaults(selectedTargetSubscription),
    enabled: !!selectedTargetSubscription,
  })

  // Fetch source secrets
  const {data: sourceSecrets = []} = useSuspenseQuery({
    queryKey: [fetchSecretsKey, sourceVaultUri],
    queryFn: () => fetchSecrets(sourceVaultUri),
  })

  // Fetch target secrets (only when target vault is selected)
  const {data: targetSecrets = [], isLoading: loadingTargetSecrets} = useQuery({
    queryKey: [fetchSecretsKey, targetVaultUri],
    queryFn: () => fetchSecrets(targetVaultUri),
    enabled: !!targetVaultUri,
  })

  // Get all unique secret names from both vaults
  const allSecretNames = useMemo(() => {
    const sourceNames = sourceSecrets.map(s => getSecretName(s.id))
    const targetNames = targetSecrets.map(s => getSecretName(s.id))
    return [...new Set([...sourceNames, ...targetNames])].sort()
  }, [sourceSecrets, targetSecrets])

  // Fetch secret values when loadValues is enabled
  const secretValueQueries = useQueries({
    queries: loadValues ? allSecretNames.flatMap(name => {
      const queries = []
      const sourceSecret = sourceSecrets.find(s => getSecretName(s.id) === name)
      const targetSecret = targetSecrets.find(s => getSecretName(s.id) === name)

      if (sourceSecret) {
        queries.push({
          queryKey: ['secret', sourceVaultUri, name],
          queryFn: () => fetchSecret(sourceVaultUri, name),
          staleTime: 5 * 60 * 1000,
        })
      }
      if (targetSecret && targetVaultUri) {
        queries.push({
          queryKey: ['secret', targetVaultUri, name],
          queryFn: () => fetchSecret(targetVaultUri, name),
          staleTime: 5 * 60 * 1000,
        })
      }
      return queries
    }) : []
  })

  // Track when secret value queries have completed
  const secretValuesLoaded = secretValueQueries.length > 0 && secretValueQueries.every(q => q.isSuccess)

  // Build comparison data
  // biome-ignore lint/correctness/useExhaustiveDependencies: secretValuesLoaded triggers recomputation when values are fetched
  const comparedSecrets = useMemo((): ComparedSecret[] => {
    if (!targetVaultUri) return []

    return allSecretNames.map(name => {
      const sourceSecret = sourceSecrets.find(s => getSecretName(s.id) === name)
      const targetSecret = targetSecrets.find(s => getSecretName(s.id) === name)

      // Get cached values if they exist
      const sourceValueData = queryClient.getQueryData<SecretBundle | null>(['secret', sourceVaultUri, name])
      const targetValueData = queryClient.getQueryData<SecretBundle | null>(['secret', targetVaultUri, name])

      let status: ComparisonStatus
      if (sourceSecret && !targetSecret) {
        status = 'source-only'
      } else if (!sourceSecret && targetSecret) {
        status = 'target-only'
      } else if (loadValues && sourceValueData && targetValueData) {
        status = sourceValueData.value === targetValueData.value ? 'match' : 'mismatch'
      } else {
        status = 'match' // Default to match when values aren't loaded
      }

      return {
        name,
        status,
        sourceSecret,
        targetSecret,
        sourceValue: sourceValueData?.value,
        targetValue: targetValueData?.value,
      }
    })
  }, [allSecretNames, sourceSecrets, targetSecrets, sourceVaultUri, targetVaultUri, loadValues, queryClient, secretValuesLoaded])

  // Summary stats
  const stats = useMemo(() => {
    return {
      total: comparedSecrets.length,
      matches: comparedSecrets.filter(s => s.status === 'match').length,
      mismatches: comparedSecrets.filter(s => s.status === 'mismatch').length,
      sourceOnly: comparedSecrets.filter(s => s.status === 'source-only').length,
      targetOnly: comparedSecrets.filter(s => s.status === 'target-only').length,
    }
  }, [comparedSecrets])

  // Create secret mutation
  const createMutation = useMutation({
    mutationFn: ({name, value}: {name: string; value: string}) => createSecret(targetVaultUri, name, value),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: [fetchSecretsKey, targetVaultUri]})
      showSuccess(`Secret "${variables.name}" created in target vault`)
    },
    onError: (error, variables) => {
      const errorMsg = error instanceof Error ? error.message : String(error)
      showError(`Failed to create secret "${variables.name}"`, errorMsg)
    }
  })

  // Sync a single secret from source to target
  const handleSyncSecret = async (secretName: string) => {
    // First, get the source value if not already loaded
    let sourceValue = queryClient.getQueryData<SecretBundle | null>(['secret', sourceVaultUri, secretName])?.value

    if (!sourceValue) {
      try {
        const sourceBundle = await fetchSecret(sourceVaultUri, secretName)
        sourceValue = sourceBundle?.value
      } catch (_error) {
        showError(`Failed to fetch source value for "${secretName}"`)
        return
      }
    }

    if (!sourceValue) {
      showError(`No value found for source secret "${secretName}"`)
      return
    }

    createMutation.mutate({name: secretName, value: sourceValue})
  }

  // Create all missing secrets in target
  const handleSyncAllMissing = async () => {
    const missingSecrets = comparedSecrets.filter(s => s.status === 'source-only')

    for (const secret of missingSecrets) {
      await handleSyncSecret(secret.name)
    }
  }

  // Open modal to create with custom value
  const handleCreateWithValue = (secretName: string, suggestedValue?: string) => {
    setCreateWithValueModal({
      isOpen: true,
      secretName,
      suggestedValue
    })
  }

  const handleConfirmCreateWithValue = (value: string) => {
    createMutation.mutate({name: createWithValueModal.secretName, value})
    setCreateWithValueModal({isOpen: false, secretName: '', suggestedValue: undefined})
  }

  // Handle target vault selection
  const handleTargetVaultChange = (vaultUri: string) => {
    const vault = targetKeyvaults.find(kv => kv.properties.vaultUri === vaultUri)
    setTargetVaultUri(vaultUri)
    setTargetName(vault?.name || '')
  }

  const getStatusIcon = (status: ComparisonStatus) => {
    switch (status) {
      case 'match':
        return <CheckIcon className="w-4 h-4 text-green-500"/>
      case 'mismatch':
        return <AlertTriangleIcon className="w-4 h-4 text-yellow-500"/>
      case 'source-only':
        return <ArrowRightIcon className="w-4 h-4 text-blue-500"/>
      case 'target-only':
        return <ArrowLeftIcon className="w-4 h-4 text-purple-500"/>
    }
  }

  const getStatusBadge = (status: ComparisonStatus) => {
    const classes = {
      'match': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      'mismatch': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      'source-only': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'target-only': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    }
    const labels = {
      'match': 'Match',
      'mismatch': 'Different',
      'source-only': 'Missing in Target',
      'target-only': 'Missing in Source',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${classes[status]}`}>
        {labels[status]}
      </span>
    )
  }

  return (
    <Suspense fallback={<CompareLoadingSpinner/>}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate({
                  to: '/keyvault',
                  search: {vaultUri: sourceVaultUri, name: sourceName, subscriptionId: sourceSubscriptionId}
                })}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Back to vault"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/>
              </button>
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <GitCompareIcon className="w-6 h-6 text-primary-600 dark:text-primary-400"/>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Compare Vaults</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {sourceName} → {targetName || 'Select target vault'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {targetVaultUri && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLoadValues(!loadValues)}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    loadValues
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={loadValues ? 'Values loaded' : 'Load and compare values'}
                >
                  <RefreshCwIcon className="w-4 h-4"/>
                  {loadValues ? 'Values Loaded' : 'Compare Values'}
                </button>

                {stats.sourceOnly > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncAllMissing}
                    disabled={createMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
                    title="Create all missing secrets in target vault"
                  >
                    <CopyIcon className="w-4 h-4"/>
                    Sync All Missing ({stats.sourceOnly})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Target Vault Selection */}
        <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="target-subscription-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Subscription
              </label>
              <select
                id="target-subscription-select"
                value={selectedTargetSubscription}
                onChange={(e) => {
                  setSelectedTargetSubscription(e.target.value)
                  setTargetVaultUri('')
                  setTargetName('')
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select subscription...</option>
                {subscriptions.map((sub) => (
                  <option key={sub.subscriptionId} value={sub.subscriptionId}>
                    {sub.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="target-vault-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Key Vault
              </label>
              <select
                id="target-vault-select"
                value={targetVaultUri}
                onChange={(e) => handleTargetVaultChange(e.target.value)}
                disabled={!selectedTargetSubscription || loadingTargetKeyvaults}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingTargetKeyvaults ? 'Loading...' : 'Select vault...'}
                </option>
                {targetKeyvaults
                  .filter(kv => kv.properties.vaultUri !== sourceVaultUri) // Exclude source vault
                  .map((kv) => (
                    <option key={kv.id} value={kv.properties.vaultUri}>
                      {kv.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {!targetVaultUri ? (
            <div className="text-center py-12">
              <GitCompareIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4"/>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Select a target vault to compare
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Choose a subscription and key vault above to compare secrets with {sourceName}
              </p>
            </div>
          ) : loadingTargetSecrets ? (
            <div className="text-center py-12">
              <LoadingSpinner size="md"/>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Loading secrets from {targetName}...
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Secrets</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.matches}</div>
                  <div className="text-sm text-green-600 dark:text-green-500">Matching</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.mismatches}</div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-500">Different Values</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.sourceOnly}</div>
                  <div className="text-sm text-blue-600 dark:text-blue-500">Missing in Target</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.targetOnly}</div>
                  <div className="text-sm text-purple-600 dark:text-purple-500">Missing in Source</div>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Secret Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {sourceName} (Source)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {targetName} (Target)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {comparedSecrets.map((secret) => (
                      <tr key={secret.name} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(secret.status)}
                            <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                              {secret.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(secret.status)}
                        </td>
                        <td className="px-4 py-3">
                          {secret.sourceSecret ? (
                            <div className="text-sm">
                              {loadValues && secret.sourceValue ? (
                                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono truncate max-w-50 block">
                                  {secret.sourceValue.substring(0, 30)}{secret.sourceValue.length > 30 ? '...' : ''}
                                </code>
                              ) : (
                                <span className="text-green-600 dark:text-green-400">✓ Exists</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {secret.targetSecret ? (
                            <div className="text-sm">
                              {loadValues && secret.targetValue ? (
                                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono truncate max-w-50 block">
                                  {secret.targetValue.substring(0, 30)}{secret.targetValue.length > 30 ? '...' : ''}
                                </code>
                              ) : (
                                <span className="text-green-600 dark:text-green-400">✓ Exists</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {secret.status === 'source-only' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSyncSecret(secret.name)}
                                  disabled={createMutation.isPending}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded transition-colors disabled:opacity-50"
                                  title="Copy secret from source to target"
                                >
                                  <CopyIcon className="w-3 h-3"/>
                                  Sync
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCreateWithValue(secret.name, secret.sourceValue)}
                                  disabled={createMutation.isPending}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                                  title="Create secret with custom value"
                                >
                                  <PlusIcon className="w-3 h-3"/>
                                  Custom
                                </button>
                              </>
                            )}
                            {secret.status === 'mismatch' && (
                              <button
                                type="button"
                                onClick={() => handleSyncSecret(secret.name)}
                                disabled={createMutation.isPending}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded transition-colors disabled:opacity-50"
                                title="Overwrite target with source value"
                              >
                                <RefreshCwIcon className="w-3 h-3"/>
                                Update
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {comparedSecrets.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No secrets to compare
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create with Value Modal */}
      <CreateWithValueModal
        isOpen={createWithValueModal.isOpen}
        onClose={() => setCreateWithValueModal({isOpen: false, secretName: '', suggestedValue: undefined})}
        onConfirm={handleConfirmCreateWithValue}
        secretName={createWithValueModal.secretName}
        suggestedValue={createWithValueModal.suggestedValue}
        isCreating={createMutation.isPending}
      />
    </Suspense>
  )
}

function CompareError({error}: {error: Error}) {
  return (
    <div className="h-full flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
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
