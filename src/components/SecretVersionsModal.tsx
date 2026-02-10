import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardIcon, DownloadIcon, HistoryIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { fetchSecret, fetchSecretVersions, updateSecret } from "../services/azureService";
import type { Secret, SecretBundle } from "../types/secrets";
import { Button, IconButton, Modal, ModalDescription, ModalFooter, ModalTitle } from "./common";
import { LoadingSpinner } from "./LoadingSpinner";

interface SecretVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretName: string;
  vaultUri: string;
}

/** Extract the version ID from a secret's full ID URL */
function extractVersion(id: string): string {
  const parts = id.split("/");
  return parts[parts.length - 1];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VersionValueCell({
  version,
  vaultUri,
  secretName,
  loadAll,
}: {
  version: Secret;
  vaultUri: string;
  secretName: string;
  loadAll: boolean;
}) {
  const [manualLoad, setManualLoad] = useState(false);
  const { showSuccess } = useToast();

  const versionId = extractVersion(version.id);

  const { data, isLoading, error } = useQuery<SecretBundle | null>({
    queryKey: ["secret-version-value", vaultUri, secretName, versionId],
    queryFn: ({ signal }) => fetchSecret(vaultUri, secretName, versionId, signal),
    enabled: manualLoad || loadAll,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showSuccess("Value copied to clipboard");
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    },
    [showSuccess],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <LoadingSpinner size="sm" />
        <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return <span className="text-xs text-red-600 dark:text-red-400">{errorMsg}</span>;
  }

  if (data?.value) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0 p-1.5 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs break-all max-h-16 overflow-y-auto">
          {data.value}
        </div>
        <IconButton
          icon={<ClipboardIcon className="w-3.5 h-3.5" />}
          label="Copy version value"
          variant="secondary"
          size="sm"
          onClick={() => copyToClipboard(data.value)}
        />
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={() => setManualLoad(true)}
      leftIcon={<DownloadIcon className="w-3 h-3" />}
      title="Load this version's value"
    >
      Load
    </Button>
  );
}

export function SecretVersionsModal({
  isOpen,
  onClose,
  secretName,
  vaultUri,
}: SecretVersionsModalProps) {
  const [loadAll, setLoadAll] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const {
    data: versions,
    isLoading,
    error,
  } = useQuery<Secret[]>({
    queryKey: ["secret-versions", vaultUri, secretName],
    queryFn: () => fetchSecretVersions(vaultUri, secretName),
    enabled: isOpen,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Mutation for restoring a version (creates a new version with the old value)
  const restoreMutation = useMutation({
    mutationFn: (value: string) => updateSecret(vaultUri, secretName, value),
    onSuccess: () => {
      showSuccess(`Version restored successfully as the new latest version`);
      queryClient.invalidateQueries({ queryKey: ["secret-versions", vaultUri, secretName] });
      queryClient.invalidateQueries({ queryKey: ["secret", vaultUri, secretName] });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError("Failed to restore version", errorMsg);
    },
  });

  const sortedVersions = versions
    ? [...versions].sort((a, b) => b.attributes.created - a.attributes.created)
    : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <ModalTitle>
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-5 h-5 text-primary-500" />
          Versions of "{secretName}"
        </div>
      </ModalTitle>
      <div className="flex items-center justify-between mb-4">
        <ModalDescription>
          {isLoading
            ? "Loading versions..."
            : sortedVersions.length > 0
              ? `${sortedVersions.length} version${sortedVersions.length !== 1 ? "s" : ""} found. Each update to a secret creates a new version.`
              : "No versions found."}
        </ModalDescription>
        {!isLoading && sortedVersions.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLoadAll(true)}
            disabled={loadAll}
            title="Load values for all versions"
          >
            {loadAll ? "All Loaded" : "Load All"}
          </Button>
        )}
      </div>

      <div className="max-h-[60vh] overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 py-4">
            Failed to load versions: {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {!isLoading && !error && sortedVersions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <HistoryIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No versions found for this secret.</p>
          </div>
        )}

        {!isLoading && sortedVersions.length > 0 && (
          <div className="space-y-3">
            {sortedVersions.map((version, index) => {
              const versionId = extractVersion(version.id);
              const isLatest = index === 0;

              return (
                <div
                  key={version.id}
                  className={`border rounded-lg p-3 transition-colors ${
                    isLatest
                      ? "border-primary-300 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {/* Version header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate max-w-64"
                        title={versionId}
                      >
                        {versionId}
                      </span>
                      {isLatest && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 whitespace-nowrap">
                          Latest
                        </span>
                      )}
                    </div>
                    {!isLatest && (
                      <IconButton
                        icon={<RefreshCwIcon className="w-4 h-4" />}
                        label="Restore this version"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          // Fetch the value and restore it
                          fetchSecret(vaultUri, secretName, versionId).then((bundle) => {
                            if (bundle?.value) {
                              restoreMutation.mutate(bundle.value);
                            }
                          });
                        }}
                        disabled={restoreMutation.isPending}
                      />
                    )}
                  </div>

                  {/* Version value */}
                  <div className="mb-2">
                    <VersionValueCell
                      version={version}
                      vaultUri={vaultUri}
                      secretName={secretName}
                      loadAll={loadAll}
                    />
                  </div>

                  {/* Version metadata */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 dark:text-gray-500">Created:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatDate(version.attributes.created)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
