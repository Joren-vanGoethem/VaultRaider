import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useCallback, useMemo, useState } from "react";
import { BulkDeleteModal } from "../components/BulkDeleteModal";
import { CompareVaultsModal } from "../components/CompareVaultsModal";
import { CreateSecretModal } from "../components/CreateSecretModal";
import { ExportSecretsModal } from "../components/ExportSecretsModal";
import { ImportSecretsModal } from "../components/ImportSecretsModal";
import { KeyvaultHeader } from "../components/KeyvaultHeader";
import { KeyvaultSearchBar } from "../components/KeyvaultSearchBar";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { SecretsEmptyState } from "../components/SecretsEmptyState";
import { SecretsList } from "../components/SecretsList";
import { useToast } from "../contexts/ToastContext";
import {
  createSecret,
  deleteSecret,
  fetchSecrets,
  fetchSecretsKey,
} from "../services/azureService";

type KeyvaultSearch = {
  vaultUri: string;
  name: string;
  subscriptionId?: string;
};

export const Route = createFileRoute("/keyvault")({
  component: Keyvaults,
  pendingComponent: SecretsLoadingSpinner,
  errorComponent: SecretsError,
  validateSearch: (search: Record<string, unknown>): KeyvaultSearch => {
    return {
      vaultUri: search.vaultUri as string,
      name: search.name as string,
      subscriptionId: search.subscriptionId as string | undefined,
    };
  },
});

function SecretsLoadingSpinner() {
  return (
    <div className="h-full flex items-center justify-center p-10">
      <LoadingSpinner size="md" />
    </div>
  );
}

function Keyvaults() {
  const { vaultUri, name, subscriptionId } = Route.useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [loadAll, setLoadAll] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSecrets, setSelectedSecrets] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // Use React Query to fetch secrets list
  const { data: secrets } = useSuspenseQuery({
    queryKey: [fetchSecretsKey, vaultUri],
    queryFn: () => fetchSecrets(vaultUri),
  });

  // Helper function to extract secret name from ID
  const getSecretName = useCallback((id: string) => {
    const parts = id.split("/");
    return parts[parts.length - 1];
  }, []);

  // Filter secrets based on search query
  const filteredSecrets = useMemo(() => {
    return secrets.filter((secret) => {
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      const secretName = getSecretName(secret.id).toLowerCase();

      // Basic name filtering - value filtering happens in SecretCard after values are loaded
      return secretName.includes(query);
    });
  }, [secrets, searchQuery, getSecretName]);

  // Mutation for creating a new secret
  const createMutation = useMutation({
    mutationFn: ({ name, value }: { name: string; value: string }) =>
      createSecret(vaultUri, name, value),
    onSuccess: (_data, variables) => {
      // Invalidate and refetch secrets list
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] });
      setShowCreateModal(false);
      showSuccess(`Secret "${variables.name}" created successfully`);
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Failed to create secret:", errorMsg);
      showError("Failed to create secret", errorMsg);
    },
  });

  // Mutation for bulk deleting secrets
  const bulkDeleteMutation = useMutation({
    mutationFn: async (secretIds: string[]) => {
      const results = await Promise.allSettled(
        secretIds.map((id) => {
          const secretName = getSecretName(id);
          return deleteSecret(vaultUri, secretName);
        }),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        throw new Error(`Failed to delete ${failed.length} secret(s)`);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] });
      setShowBulkDeleteModal(false);
      showSuccess(`Successfully deleted ${selectedSecrets.size} secret(s)`);
      setSelectedSecrets(new Set());
      setSelectionMode(false);
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Failed to bulk delete secrets:", errorMsg);
      showError("Failed to delete some secrets", errorMsg);
      // Refresh anyway to show current state
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] });
      setShowBulkDeleteModal(false);
    },
  });

  // Handler functions
  const handleConfirmCreate = (name: string, value: string) => {
    createMutation.mutate({ name, value });
  };

  const handleSelectionChange = useCallback((secretId: string, selected: boolean) => {
    setSelectedSecrets((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(secretId);
      } else {
        newSet.delete(secretId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredSecrets.map((s) => s.id));
    setSelectedSecrets(allIds);
  }, [filteredSecrets]);

  const handleDeselectAll = useCallback(() => {
    setSelectedSecrets(new Set());
  }, []);

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    if (selectionMode) {
      setSelectedSecrets(new Set());
    }
  }, [selectionMode]);

  const handleBulkDelete = useCallback(() => {
    if (selectedSecrets.size > 0) {
      setShowBulkDeleteModal(true);
    }
  }, [selectedSecrets.size]);

  const handleConfirmBulkDelete = useCallback(() => {
    bulkDeleteMutation.mutate(Array.from(selectedSecrets));
  }, [bulkDeleteMutation, selectedSecrets]);

  const selectedSecretNames = useMemo(() => {
    return Array.from(selectedSecrets).map((id) => getSecretName(id));
  }, [selectedSecrets, getSecretName]);

  const handleImportComplete = () => {
    queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] });
  };

  return (
    <Suspense fallback={<SecretsLoadingSpinner />}>
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
          <div className="flex flex-row pb-3 justify-between">
            {/* Search Bar */}
            {secrets.length > 0 && (
              <KeyvaultSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                totalCount={secrets.length}
                filteredCount={filteredSecrets.length}
              />
            )}

            <button
              type="button"
              onClick={handleToggleSelectionMode}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectionMode
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {selectionMode ? "Exit Selection Mode" : "Select Multiple"}
            </button>
          </div>

          {secrets.length > 0 && selectionMode && (
            <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Select All ({filteredSecrets.length})
              </button>

              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                disabled={selectedSecrets.size === 0}
              >
                Deselect All
              </button>

              <div className="flex-1" />

              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedSecrets.size} selected
              </span>

              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedSecrets.size === 0}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Selected
              </button>
            </div>
          )}

          {/* Secrets Grid/List */}
          {secrets.length === 0 ? (
            <SecretsEmptyState type="no-secrets" />
          ) : filteredSecrets.length === 0 ? (
            <SecretsEmptyState
              type="no-results"
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery("")}
            />
          ) : (
            <SecretsList
              secrets={filteredSecrets}
              vaultUri={vaultUri}
              searchQuery={searchQuery}
              shouldLoadAll={loadAll}
              selectionMode={selectionMode}
              selectedSecrets={selectedSecrets}
              onSelectionChange={handleSelectionChange}
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

        <BulkDeleteModal
          isOpen={showBulkDeleteModal}
          onConfirm={handleConfirmBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
          secretNames={selectedSecretNames}
          isDeleting={bulkDeleteMutation.isPending}
        />
      </div>
    </Suspense>
  );
}

function SecretsError({ error }: { error: Error }) {
  return (
    <div className="h-full flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          Something went wrong
        </h2>

        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error.message}</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
