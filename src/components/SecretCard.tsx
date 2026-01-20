import {useMemo, useState} from 'react'
import {fetchSecret, deleteSecret as deleteSecretService, fetchSecretsKey} from '../services/azureService'
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
}

export function SecretCard({secret, vaultUri, searchQuery = '', shouldLoad = false}: SecretCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [manualLoad, setManualLoad] = useState(false)
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

  const handleLoadSecret = () => {
    setManualLoad(true)
  }

  const loadErrorMessage = error instanceof Error ? error.message : error ? String(error) : null

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        loading 
          ? 'border-yellow-400 dark:border-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10' 
          : loadErrorMessage
          ? 'border-red-400 dark:border-red-500'
          : isSearchMatch
          ? 'border-primary-500 dark:border-primary-400 bg-primary-50/30 dark:bg-primary-900/10'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400'
      }`}
    >
      <SecretHeader
        name={secretName}
        id={secret.id}
        enabled={secret.attributes.enabled}
        onDelete={handleDeleteClick}
        isDeleting={deleteMutation.isPending}
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
    </div>
  )
}

