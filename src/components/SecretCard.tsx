import {useMemo} from 'react'
import {fetchSecret} from '../services/azureService'
import type {Secret, SecretBundle} from '../types/secrets'
import {LoadingSpinner} from './LoadingSpinner'
import {useQuery} from '@tanstack/react-query'

interface SecretCardProps {
  secret: Secret
  vaultUri: string
  searchQuery?: string
}

export function SecretCard({secret, vaultUri, searchQuery = ''}: SecretCardProps) {
  // Helper function to format Unix timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Extract secret name from ID
  const getSecretName = (id: string) => {
    const parts = id.split('/')
    return parts[parts.length - 1]
  }

  const secretName = getSecretName(secret.id)

  // Use React Query to fetch the secret value
  const { data: secretBundle, isLoading: loading, error } = useQuery<SecretBundle | null>({
    queryKey: ['secret', vaultUri, secretName],
    queryFn: () => fetchSecret(vaultUri, secretName),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (formerly cacheTime)
  })

  // Check if this card should be highlighted based on search query
  const isSearchMatch = useMemo(() => {
    if (!searchQuery) return false
    const query = searchQuery.toLowerCase()
    const nameMatch = secretName.toLowerCase().includes(query)
    const valueMatch = secretBundle?.value?.toLowerCase().includes(query) || false
    return nameMatch || valueMatch
  }, [searchQuery, secretName, secretBundle])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        loading 
          ? 'border-yellow-400 dark:border-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10' 
          : errorMessage
          ? 'border-red-400 dark:border-red-500'
          : isSearchMatch
          ? 'border-primary-500 dark:border-primary-400 bg-primary-50/30 dark:bg-primary-900/10'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {secretName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-mono break-all">
            {secret.id}
          </p>
        </div>
      </div>

      {/* Secret Value Section */}
      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Secret Value:</span>
          {loading && (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && secretBundle && (
          <div>
            <div className="flex items-center gap-2 mb-2 w-full">
              <div className="p-2 w-full bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 font-mono text-sm break-all">
                {secretBundle.value}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(secretBundle.value)}
                className="text-sm p-2 rounded min-w-max bg-gray-500 hover:bg-gray-600 text-white transition-colors font-medium"
                title="Copy secret value to clipboard"
              >
                📋 Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attributes Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <span className={`ml-2 font-medium ${
            secret.attributes.enabled 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {secret.attributes.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Recovery Level:</span>
          <span className="ml-2 text-gray-900 dark:text-gray-100">
            {secret.attributes.recoveryLevel}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Created:</span>
          <span className="ml-2 text-gray-900 dark:text-gray-100">
            {formatDate(secret.attributes.created)}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Updated:</span>
          <span className="ml-2 text-gray-900 dark:text-gray-100">
            {formatDate(secret.attributes.updated)}
          </span>
        </div>
      </div>
    </div>
  )
}

