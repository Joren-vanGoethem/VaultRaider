import {useEffect, useState} from 'react'
import {fetchSecret} from '../services/azureService'
import type {Secret, SecretBundle} from '../types/secrets'
import {LoadingSpinner} from './LoadingSpinner'

interface SecretCardProps {
  secret: Secret
  vaultUri: string
}

export function SecretCard({secret, vaultUri}: SecretCardProps) {
  const [secretBundle, setSecretBundle] = useState<SecretBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showValue, setShowValue] = useState(false)

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  useEffect(() => {
    const secretName = getSecretName(secret.id)
    setLoading(true)
    setError(null)

    fetchSecret(vaultUri, secretName)
      .then((bundle) => {
        if (bundle) {
          setSecretBundle(bundle)
        } else {
          setError('Failed to load secret value')
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      })
  }, [secret.id, vaultUri])

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        loading 
          ? 'border-yellow-400 dark:border-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10' 
          : error
          ? 'border-red-400 dark:border-red-500'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {getSecretName(secret.id)}
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

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && secretBundle && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="text-xs px-3 py-1.5 rounded bg-primary-500 hover:bg-primary-600 text-white transition-colors font-medium"
                title={showValue ? 'Hide secret value' : 'Show secret value'}
              >
                {showValue ? '🙈 Hide' : '👁️ Show'}
              </button>
              {showValue && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(secretBundle.value)}
                  className="text-xs px-3 py-1.5 rounded bg-gray-500 hover:bg-gray-600 text-white transition-colors font-medium"
                  title="Copy secret value to clipboard"
                >
                  📋 Copy
                </button>
              )}
            </div>
            {showValue && (
              <div className="p-2 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 font-mono text-sm break-all">
                {secretBundle.value}
              </div>
            )}
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

