import {useMemo, useState} from 'react'
import {fetchSecret, deleteSecret as deleteSecretService} from '../services/azureService'
import type {Secret, SecretBundle} from '../types/secrets'
import {LoadingSpinner} from './LoadingSpinner'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {TrashIcon} from "lucide-react";

interface SecretCardProps {
  secret: Secret
  vaultUri: string
  searchQuery?: string
}

export function SecretCard({secret, vaultUri, searchQuery = ''}: SecretCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const queryClient = useQueryClient()

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

  // TODO@JOREN: test delete functionality
  // Mutation for deleting the secret
  const deleteMutation = useMutation({
    mutationFn: () => deleteSecretService(vaultUri, secretName),
    onSuccess: () => {
      // Invalidate and refetch secrets list
      queryClient.invalidateQueries({ queryKey: ['secrets', vaultUri] })
      setShowDeleteModal(false)
    },
    onError: (error) => {
      console.error('Failed to delete secret:', error)
      alert(`Failed to delete secret: ${error instanceof Error ? error.message : String(error)}`)
    }
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

  const handleDeleteClick = () => {
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    deleteMutation.mutate()
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
  }

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        loading 
          ? 'border-yellow-400 dark:border-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10' 
          : errorMessage
          ? 'border-red-400 dark:border-red-500'
          : isSearchMatch
          ? 'border-primary-500 dark:border-primary-400 bg-primary-50/30 dark:bg-primary-900/10'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400'
      }`}
    >
      {/* Header: Name and ID */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                {secretName}
              </h3>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                secret.attributes.enabled 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {secret.attributes.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="text-xs px-2 py-1.5 rounded bg-red-500 hover:bg-red-600 text-white transition-colors font-medium shrink-0"
                title="Delete secret"
                disabled={deleteMutation.isPending}
              >
                <TrashIcon className="w-4 h-4"/>
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" title={secret.id}>
            {secret.id}
          </p>
        </div>
      </div>

      {/* Secret Value Section - Compact */}
      {/*<div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">*/}
        {loading ? (
          <div className="flex items-center gap-2 py-1">
            <LoadingSpinner size="sm" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Loading value...</span>
          </div>
        ) : errorMessage ? (
          <div className="text-xs text-red-600 dark:text-red-400 py-1">
            {errorMessage}
          </div>
        ) : secretBundle ? (
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 p-1.5 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs break-all max-h-20 overflow-y-auto">
              {secretBundle.value}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(secretBundle.value)}
              className="text-xs px-2 py-1.5 rounded bg-gray-500 hover:bg-gray-600 text-white transition-colors font-medium shrink-0"
              title="Copy secret value to clipboard"
            >
              📋
            </button>
          </div>
        ) : null}
      {/*</div>*/}

      {/* Attributes - Compact Inline */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-500">Recovery:</span>
          <span className="text-gray-900 dark:text-gray-100">{secret.attributes.recoveryLevel}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-500">Created:</span>
          <span className="text-gray-900 dark:text-gray-100">{formatDate(secret.attributes.created)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-500">Updated:</span>
          <span className="text-gray-900 dark:text-gray-100">{formatDate(secret.attributes.updated)}</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancelDelete}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Delete Secret
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete the secret <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">"{secretName}"</span>?
              {secret.attributes.recoveryLevel?.includes('Recoverable')
                ? ' This secret can be recovered after deletion.'
                : ' This action cannot be undone.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

