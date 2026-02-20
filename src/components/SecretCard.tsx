import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import {
  deleteSecret as deleteSecretService,
  fetchSecret,
  fetchSecretsKey,
  updateSecret,
} from "../services/azureService";
import type { Secret, SecretBundle } from "../types/secrets";
import { extractSecretName, parseAzureError } from "../utils/stringUtils";
import { Button, ConfirmDialog, Modal, ModalFooter, ModalTitle } from "./common";
import { SecretAttributes } from "./SecretAttributes";
import { SecretHeader } from "./SecretHeader";
import { SecretValue } from "./SecretValue";
import { SecretVersionsModal } from "./SecretVersionsModal";

interface SecretCardProps {
  secret: Secret;
  vaultUri: string;
  searchQuery?: string;
  shouldLoad?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (secretId: string, selected: boolean) => void;
  showDetails?: boolean;
}

export function SecretCard({
  secret,
  vaultUri,
  searchQuery = "",
  shouldLoad = false,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
  showDetails = false,
}: SecretCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [manualLoad, setManualLoad] = useState(false);
  const [editValue, setEditValue] = useState("");
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // Extract secret name from ID
  const secretName = extractSecretName(secret.id);

  // Determine if we should fetch the secret value
  const shouldFetch = shouldLoad || manualLoad;

  // Use React Query to fetch the secret value - only when enabled
  const {
    data: secretBundle,
    isLoading: loading,
    error,
  } = useQuery<SecretBundle | null>({
    queryKey: ["secret", vaultUri, secretName],
    queryFn: ({ signal }) => fetchSecret(vaultUri, secretName, undefined, signal),
    enabled: shouldFetch, // Only fetch when explicitly requested
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (formerly cacheTime)
  });

  // Mutation for deleting the secret
  const deleteMutation = useMutation({
    mutationFn: () => deleteSecretService(vaultUri, secretName),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [fetchSecretsKey, vaultUri] });

      // Snapshot the previous value
      const previousSecrets = queryClient.getQueryData([fetchSecretsKey, vaultUri]);

      // Optimistically update to remove the secret
      queryClient.setQueryData([fetchSecretsKey, vaultUri], (old: Secret[]) => {
        if (!old) return old;
        return old.filter((s: Secret) => s.id !== secret.id);
      });

      // Return a context object with the snapshotted value
      return { previousSecrets };
    },
    onSuccess: (data) => {
      // Verify we got a valid Secret object back
      if (typeof data === "string") {
        // If we got a string instead of a Secret, treat it as an error
        console.error("Unexpected string response from delete:", data);
        showError("Failed to delete secret", data);
        setShowDeleteModal(false);

        // Rollback the optimistic update
        queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] });
        return;
      }

      showSuccess(`Secret "${secretName}" deleted successfully`);
      setShowDeleteModal(false);
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] });
    },
    onError: (error, _variables, context) => {
      // Parse the error message to extract the actual error details
      const errorMsg = parseAzureError(error);

      console.error("Failed to delete secret:", errorMsg);
      showError("Failed to delete secret", errorMsg);

      // Rollback on error
      if (context?.previousSecrets) {
        queryClient.setQueryData([fetchSecretsKey, vaultUri], context.previousSecrets);
      }

      setShowDeleteModal(false);
    },
  });

  // Mutation for updating the secret
  const updateMutation = useMutation({
    mutationFn: (newValue: string) => updateSecret(vaultUri, secretName, newValue),
    onSuccess: () => {
      showSuccess(`Secret "${secretName}" updated successfully`);
      setShowEditModal(false);
      setEditValue("");
      // Invalidate the secrets list, individual secret cache, and version history
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] });
      queryClient.invalidateQueries({ queryKey: ["secret", vaultUri, secretName] });
      queryClient.invalidateQueries({ queryKey: ["secret-versions", vaultUri, secretName] });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Failed to update secret:", errorMsg);
      showError("Failed to update secret", errorMsg);
      setShowEditModal(false);
    },
  });

  // Check if this card should be highlighted based on search query
  const isSearchMatch = useMemo(() => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    const nameMatch = secretName.toLowerCase().includes(query);
    const valueMatch = secretBundle?.value?.toLowerCase().includes(query) || false;
    return nameMatch || valueMatch;
  }, [searchQuery, secretName, secretBundle]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleEditClick = () => {
    setEditValue(secretBundle?.value || "");
    setShowEditModal(true);
  };

  const handleConfirmEdit = () => {
    if (!editValue.trim()) {
      showError("Invalid input", "Secret value cannot be empty");
      return;
    }
    updateMutation.mutate(editValue);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditValue("");
  };

  const handleLoadSecret = () => {
    setManualLoad(true);
  };

  const handleSelectionToggle = () => {
    onSelectionChange?.(secret.id, !isSelected);
  };

  const loadErrorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div
      onClick={selectionMode ? handleSelectionToggle : undefined}
      className={`flex-col border rounded-lg p-3 transition-colors shadow-sm ${
        selectionMode ? "cursor-pointer" : ""
      } ${
        isSelected
          ? "border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500/50"
          : loading
            ? "border-yellow-400 dark:border-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10"
            : loadErrorMessage
              ? "border-red-400 dark:border-red-500"
              : isSearchMatch
                ? "border-primary-500 dark:border-primary-400 bg-primary-50/30 dark:bg-primary-900/10"
                : "border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400"
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
            {isSelected ? "Selected" : "Click to select"}
          </span>
        </div>
      )}
      <SecretHeader
        name={secretName}
        enabled={secret.attributes.enabled}
        onDelete={handleDeleteClick}
        onEdit={handleEditClick}
        onVersions={() => setShowVersionsModal(true)}
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

      {showDetails && (
        <SecretAttributes
          recoveryLevel={secret.attributes.recoveryLevel}
          created={secret.attributes.created}
          updated={secret.attributes.updated}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Secret"
        description={
          <>
            Are you sure you want to delete the secret{" "}
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              "{secretName}"
            </span>
            ?{" "}
            {secret.attributes.recoveryLevel?.includes("Recoverable")
              ? "This secret can be recovered after deletion."
              : "This action cannot be undone."}
          </>
        }
        variant="danger"
        isLoading={deleteMutation.isPending}
        loadingText="Deleting..."
        confirmText="Delete"
        showWarningIcon
      />

      <SecretVersionsModal
        isOpen={showVersionsModal}
        onClose={() => setShowVersionsModal(false)}
        secretName={secretName}
        vaultUri={vaultUri}
      />

      {/* Edit Secret Modal */}
      <Modal isOpen={showEditModal} onClose={handleCancelEdit}>
        <ModalTitle>Edit Secret</ModalTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmEdit();
          }}
        >
          <div className="mb-4">
            <label
              htmlFor={"secretNameInput"}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Secret Name
            </label>
            <input
              id="secretNameInput"
              type="text"
              value={secretName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono text-sm"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor={"secretValueInput"}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Secret Value
            </label>
            <textarea
              id="secretValueInput"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm min-h-25 resize-y"
              placeholder="Enter secret value"
              // biome-ignore lint/a11y/noAutofocus: weird rule
              autoFocus
            />
          </div>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={handleCancelEdit}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={updateMutation.isPending}
              isLoading={updateMutation.isPending}
              loadingText="Updating..."
            >
              Update
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
