import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, KeyIcon, RotateCcw, SearchIcon, Trash2 } from "lucide-react";
import { Suspense, useCallback, useMemo, useState } from "react";
import { DeletedSecretsList } from "../components/DeletedSecretsList";
import { Button, PageError, PageLoadingSpinner } from "../components/common";
import { Modal, ModalDescription, ModalFooter, ModalTitle } from "../components/common";
import { useToast } from "../contexts/ToastContext";
import {
  fetchDeletedSecrets,
  fetchDeletedSecretsKey,
  fetchSecretsKey,
  purgeDeletedSecret,
  recoverDeletedSecret,
} from "../services/azureService";
import type { DeletedSecretItem } from "../types/secrets";
import { requireAuth } from "../utils/routeGuards";

type DeletedSecretsSearch = {
  vaultUri: string;
  name: string;
  subscriptionId?: string;
  enablePurgeProtection?: boolean;
  enableSoftDelete?: boolean;
};

export const Route = createFileRoute("/deleted-secrets")({
  component: DeletedSecrets,
  pendingComponent: PageLoadingSpinner,
  errorComponent: ({ error }) => <PageError error={error} />,
  validateSearch: (search: Record<string, unknown>): DeletedSecretsSearch => {
    return {
      vaultUri: search.vaultUri as string,
      name: search.name as string,
      subscriptionId: search.subscriptionId as string | undefined,
      enablePurgeProtection: search.enablePurgeProtection as boolean | undefined,
      enableSoftDelete: search.enableSoftDelete as boolean | undefined,
    };
  },
  beforeLoad: requireAuth,
});

function DeletedSecrets() {
  const { vaultUri, name, subscriptionId, enablePurgeProtection, enableSoftDelete } =
    Route.useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSecrets, setSelectedSecrets] = useState<Set<string>>(new Set());
  const [showBulkRecoverModal, setShowBulkRecoverModal] = useState(false);
  const [showBulkPurgeModal, setShowBulkPurgeModal] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // Soft delete must be enabled for deleted secrets to exist
  // If purge protection is enabled, purging is NOT allowed
  const canRecover = enableSoftDelete !== false;
  const canPurge = enablePurgeProtection !== true;

  const { data: deletedSecrets } = useSuspenseQuery({
    queryKey: [fetchDeletedSecretsKey, vaultUri],
    queryFn: () => fetchDeletedSecrets(vaultUri),
  });

  const getSecretName = useCallback((id: string) => {
    const parts = id.split("/");
    return parts[parts.length - 1];
  }, []);

  const filteredSecrets = useMemo(() => {
    return deletedSecrets.filter((secret) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const secretName = getSecretName(secret.id).toLowerCase();
      return secretName.includes(query);
    });
  }, [deletedSecrets, searchQuery, getSecretName]);

  // Bulk recover mutation
  const bulkRecoverMutation = useMutation({
    mutationFn: async (secretIds: string[]) => {
      const results = await Promise.allSettled(
        secretIds.map((id) => {
          const secretName = getSecretName(id);
          return recoverDeletedSecret(vaultUri, secretName);
        }),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        throw new Error(`Failed to recover ${failed.length} secret(s)`);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [fetchDeletedSecretsKey, vaultUri] });
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, vaultUri] });
      setShowBulkRecoverModal(false);
      showSuccess(`Successfully recovered ${selectedSecrets.size} secret(s)`);
      setSelectedSecrets(new Set());
      setSelectionMode(false);
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError("Failed to recover some secrets", errorMsg);
      queryClient.invalidateQueries({ queryKey: [fetchDeletedSecretsKey, vaultUri] });
      setShowBulkRecoverModal(false);
    },
  });

  // Bulk purge mutation
  const bulkPurgeMutation = useMutation({
    mutationFn: async (secretIds: string[]) => {
      const results = await Promise.allSettled(
        secretIds.map((id) => {
          const secretName = getSecretName(id);
          return purgeDeletedSecret(vaultUri, secretName);
        }),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        throw new Error(`Failed to purge ${failed.length} secret(s)`);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [fetchDeletedSecretsKey, vaultUri] });
      setShowBulkPurgeModal(false);
      showSuccess(`Successfully purged ${selectedSecrets.size} secret(s)`);
      setSelectedSecrets(new Set());
      setSelectionMode(false);
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError("Failed to purge some secrets", errorMsg);
      queryClient.invalidateQueries({ queryKey: [fetchDeletedSecretsKey, vaultUri] });
      setShowBulkPurgeModal(false);
    },
  });

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

  const selectedSecretNames = useMemo(() => {
    return Array.from(selectedSecrets).map((id) => getSecretName(id));
  }, [selectedSecrets, getSecretName]);

  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/keyvault"
                search={{ vaultUri, name, subscriptionId, enableSoftDelete }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                title="Back to active secrets"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {name}{" "}
                  <span className="text-red-600 dark:text-red-400 text-lg font-normal">
                    — Deleted Secrets
                  </span>
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {deletedSecrets.length} deleted secret{deletedSecrets.length !== 1 ? "s" : ""}
                  {enablePurgeProtection && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      • Purge protection enabled
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/keyvault"
                search={{ vaultUri, name, subscriptionId, enableSoftDelete }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<KeyIcon className="w-4 h-4" />}
                >
                  Active Secrets
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Search and selection controls */}
          <div className="flex flex-row pb-3 justify-between">
            {deletedSecrets.length > 0 && (
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search deleted secrets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {searchQuery && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                    {filteredSecrets.length} of {deletedSecrets.length}
                  </span>
                )}
              </div>
            )}

            {deletedSecrets.length > 0 && (
              <Button
                variant={selectionMode ? "primary" : "secondary"}
                size="sm"
                onClick={handleToggleSelectionMode}
              >
                {selectionMode ? "Exit Selection Mode" : "Select Multiple"}
              </Button>
            )}
          </div>

          {/* Selection mode toolbar */}
          {deletedSecrets.length > 0 && selectionMode && (
            <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <Button variant="secondary" size="sm" onClick={handleSelectAll}>
                Select All ({filteredSecrets.length})
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleDeselectAll}
                disabled={selectedSecrets.size === 0}
              >
                Deselect All
              </Button>

              <div className="flex-1" />

              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedSecrets.size} selected
              </span>

              {canRecover && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowBulkRecoverModal(true)}
                  disabled={selectedSecrets.size === 0}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Recover Selected
                </Button>
              )}

              {canPurge && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowBulkPurgeModal(true)}
                  disabled={selectedSecrets.size === 0}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Purge Selected
                </Button>
              )}
            </div>
          )}

          {/* Content */}
          {deletedSecrets.length === 0 ? (
            <DeletedSecretsEmptyState />
          ) : filteredSecrets.length === 0 ? (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No deleted secrets match "{searchQuery}"
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Clear search
              </button>
            </div>
          ) : selectionMode ? (
            <DeletedSecretsSelectionGrid
              secrets={filteredSecrets}
              selectedSecrets={selectedSecrets}
              onSelectionChange={handleSelectionChange}
            />
          ) : (
            <DeletedSecretsList
              secrets={filteredSecrets}
              vaultUri={vaultUri}
              canRecover={canRecover}
              canPurge={canPurge}
            />
          )}
        </div>

        {/* Bulk Recover Modal */}
        <Modal
          isOpen={showBulkRecoverModal}
          onClose={() => setShowBulkRecoverModal(false)}
        >
          <ModalTitle>Recover {selectedSecrets.size} Secret(s)</ModalTitle>
          <ModalDescription>
            Are you sure you want to recover the following secret(s)?
          </ModalDescription>
          <div className="max-h-40 overflow-auto mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <ul className="space-y-1">
              {selectedSecretNames.map((name) => (
                <li key={name} className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {name}
                </li>
              ))}
            </ul>
          </div>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => setShowBulkRecoverModal(false)}
              disabled={bulkRecoverMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => bulkRecoverMutation.mutate(Array.from(selectedSecrets))}
              disabled={bulkRecoverMutation.isPending}
              isLoading={bulkRecoverMutation.isPending}
              loadingText="Recovering..."
            >
              Recover All
            </Button>
          </ModalFooter>
        </Modal>

        {/* Bulk Purge Modal */}
        <Modal
          isOpen={showBulkPurgeModal}
          onClose={() => setShowBulkPurgeModal(false)}
        >
          <ModalTitle>Purge {selectedSecrets.size} Secret(s)</ModalTitle>
          <ModalDescription>
            Are you sure you want to <strong>permanently delete</strong> the following secret(s)?
            This action is <strong>irreversible</strong>.
          </ModalDescription>
          <div className="max-h-40 overflow-auto mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <ul className="space-y-1">
              {selectedSecretNames.map((name) => (
                <li key={name} className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {name}
                </li>
              ))}
            </ul>
          </div>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => setShowBulkPurgeModal(false)}
              disabled={bulkPurgeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => bulkPurgeMutation.mutate(Array.from(selectedSecrets))}
              disabled={bulkPurgeMutation.isPending}
              isLoading={bulkPurgeMutation.isPending}
              loadingText="Purging..."
            >
              Purge All Permanently
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </Suspense>
  );
}

function DeletedSecretsEmptyState() {
  return (
    <div className="text-center py-12">
      <Trash2 className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
      <p className="text-gray-600 dark:text-gray-400 text-lg">No deleted secrets</p>
      <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
        Deleted secrets with soft-delete enabled will appear here
      </p>
    </div>
  );
}

function DeletedSecretsSelectionGrid({
  secrets,
  selectedSecrets,
  onSelectionChange,
}: {
  secrets: DeletedSecretItem[];
  selectedSecrets: Set<string>;
  onSelectionChange: (secretId: string, selected: boolean) => void;
}) {
  const getSecretName = (id: string) => {
    const parts = id.split("/");
    return parts[parts.length - 1];
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
      {secrets.map((secret) => {
        const isSelected = selectedSecrets.has(secret.id);
        return (
          <div
            key={secret.id}
            onClick={() => onSelectionChange(secret.id, !isSelected)}
            className={`flex-col border rounded-lg p-3 transition-colors cursor-pointer ${
              isSelected
                ? "border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500/50"
                : "border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-900/10 hover:border-red-400 dark:hover:border-red-600"
            }`}
          >
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelectionChange(secret.id, !isSelected)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
              />
              <span className="ml-2 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {getSecretName(secret.id)}
              </span>
              <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 shrink-0">
                Deleted
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 ml-6">
              <div className="flex items-center gap-1">
                <span className="text-gray-500 dark:text-gray-500">Deleted:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(secret.deletedDate)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 dark:text-gray-500">Purge date:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(secret.scheduledPurgeDate)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
