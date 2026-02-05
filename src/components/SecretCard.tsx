import {useMemo, useState} from 'react'
import {fetchSecret, deleteSecret as deleteSecretService, updateSecret, fetchSecretsKey} from '../services/azureService'
import type {Secret, SecretBundle} from '../types/secrets'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {useToast} from '../contexts/ToastContext'
import {SecretHeader} from './SecretHeader'
import {SecretValue} from './SecretValue'
import {SecretAttributes} from './SecretAttributes'
import {DeleteConfirmationModal} from './DeleteConfirmationModal'

interface SecretCardProps {
  secret: Secret
  vaultUri: string
  searchQuery?: string
  shouldLoad?: boolean
  selectionMode?: boolean
  isSelected?: boolean
  onSelectionChange?: (secretId: string, selected: boolean) => void
}

export function SecretCard({
  secret,
  vaultUri,
  searchQuery = '',
  shouldLoad = false,
  selectionMode = false,
  isSelected = false,
  onSelectionChange
}: SecretCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [manualLoad, setManualLoad] = useState(false)
  const [editValue, setEditValue] = useState('')
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  // Extract secret name from ID
  const secretName = useMemo(() => {
    const parts = secret.id.split('/')
    return parts[parts.length - 1]
  }, [secret.id])

  // Determine if we should fetch the secret value
  const shouldFetch = shouldLoad || manualLoad

  // Use React Query to fetch the secret value - only when enabled
  const { data: secretBundle, isLoading: loading, error } = useQuery<SecretBundle | null>({
    queryKey: ['secret', vaultUri, secretName],
    queryFn: ({ signal }) => fetchSecret(vaultUri, secretName, undefined, signal),
    enabled: shouldFetch, // Only fetch when explicitly requested
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (formerly cacheTime)
  })

  // TODO@JOREN: test delete functionality
  // Mutation for deleting the secret
  const deleteMutation = useMutation({
    mutationFn: () => deleteSecretService(vaultUri, secretName),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [fetchSecretsKey, vaultUri] })

      // Snapshot the previous value
      const previousSecrets = queryClient.getQueryData([fetchSecretsKey, vaultUri])

      // Optimistically update to remove the secret
      queryClient.setQueryData([fetchSecretsKey, vaultUri], (old: any) => {
        if (!old) return old
        return old.filter((s: any) => s.id !== secret.id)
      })

      // Return a context object with the snapshotted value
      return { previousSecrets }
    },
    onSuccess: (data) => {
      // Verify we got a valid Secret object back
      if (typeof data === 'string') {
        // If we got a string instead of a Secret, treat it as an error
        console.error('Unexpected string response from delete:', data)
        showError('Failed to delete secret', data)
        setShowDeleteModal(false)

        // Rollback the optimistic update
        queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] })
        return
      }

      showSuccess(`Secret "${secretName}" deleted successfully`)
      setShowDeleteModal(false)
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] })
    },
    onError: (error, _variables, context) => {
      // Parse the error message to extract the actual error details
      let errorMsg = error instanceof Error ? error.message : String(error)

      // Try to extract the error message from the Azure API error response
      try {
        // The error might be in format: "API request failed: {...}"
        const apiFailedPrefix = 'API request failed: '
        if (errorMsg.includes(apiFailedPrefix)) {
          const jsonPart = errorMsg.substring(errorMsg.indexOf(apiFailedPrefix) + apiFailedPrefix.length)
          const errorObj = JSON.parse(jsonPart)
          if (errorObj.error?.message) {
            errorMsg = errorObj.error.message
          } else if (errorObj.error?.code) {
            errorMsg = `${errorObj.error.code}: ${errorObj.error.message || 'Unknown error'}`
          }
        }
      } catch (parseError) {
        // If parsing fails, use the original error message
        console.error('Failed to parse error message:', parseError)
      }

      console.error('Failed to delete secret:', errorMsg)
      showError('Failed to delete secret', errorMsg)

      // Rollback on error
      if (context?.previousSecrets) {
        queryClient.setQueryData([fetchSecretsKey, vaultUri], context.previousSecrets)
      }

      setShowDeleteModal(false)
    }
  })

  // Mutation for updating the secret
  const updateMutation = useMutation({
    mutationFn: (newValue: string) => updateSecret(vaultUri, secretName, newValue),
    onSuccess: () => {
      showSuccess(`Secret "${secretName}" updated successfully`)
      setShowEditModal(false)
      setEditValue('')
      // Invalidate both the secrets list and the individual secret cache
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] })
      queryClient.invalidateQueries({ queryKey: ['secret', vaultUri, secretName] })
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Failed to update secret:', errorMsg)
      showError('Failed to update secret', errorMsg)
      setShowEditModal(false)
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

  const handleEditClick = () => {
    setEditValue(secretBundle?.value || '')
    setShowEditModal(true)
  }

  const handleConfirmEdit = () => {
    if (!editValue.trim()) {
      showError('Invalid input', 'Secret value cannot be empty')
      return
    }
    updateMutation.mutate(editValue)
  }

  const handleCancelEdit = () => {
    setShowEditModal(false)
    setEditValue('')
  }

  const handleLoadSecret = () => {
    setManualLoad(true)
  }

  const handleSelectionToggle = () => {
    onSelectionChange?.(secret.id, !isSelected)
  }

  const loadErrorMessage = error instanceof Error ? error.message : error ? String(error) : null

  return (
    <div
      onClick={selectionMode ? handleSelectionToggle : undefined}
      className={`border rounded-lg p-3 transition-colors ${
        selectionMode ? 'cursor-pointer' : ''
      } ${
        isSelected
          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500/50'
          : loading 
          ? 'border-yellow-400 dark:border-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10' 
          : loadErrorMessage
          ? 'border-red-400 dark:border-red-500'
          : isSearchMatch
          ? 'border-primary-500 dark:border-primary-400 bg-primary-50/30 dark:bg-primary-900/10'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400'
      }`}
    >
      {selectionMode && (
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectionToggle}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
          />
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {isSelected ? 'Selected' : 'Click to select'}
          </span>
        </div>
      )}
      <SecretHeader
        name={secretName}
        id={secret.id}
        enabled={secret.attributes.enabled}
        onDelete={handleDeleteClick}
        onEdit={handleEditClick}
        isDeleting={deleteMutation.isPending}
        hasValue={!!secretBundle?.value}
      />

      <SecretValue
        value={secretBundle?.value}
        isLoading={loading}
        error={loadErrorMessage}
        onLoad={handleLoadSecret}
        onCopy={copyToClipboard}
      />

      <SecretAttributes
        recoveryLevel={secret.attributes.recoveryLevel}
        created={secret.attributes.created}
        updated={secret.attributes.updated}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        itemName={secretName}
        itemType="Secret"
        isDeleting={deleteMutation.isPending}
        recoveryMessage={
          secret.attributes.recoveryLevel?.includes('Recoverable')
            ? 'This secret can be recovered after deletion.'
            : 'This action cannot be undone.'
        }
      />

      {/* Edit Secret Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancelEdit}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Edit Secret
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); handleConfirmEdit(); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secret Name
                </label>
                <input
                  type="text"
                  value={secretName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secret Value
                </label>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm min-h-25 resize-y"
                  placeholder="Enter secret value"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

