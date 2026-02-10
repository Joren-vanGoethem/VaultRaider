import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Suspense, useMemo, useState } from "react";
import {
  CompareEmptyState,
  CompareHeader,
  type CompareSearch,
  ComparisonStatsSection,
  type ComparisonStatus,
  ComparisonTable,
  CreateWithValueModal,
  TargetVaultSelector,
  useCompareSecrets,
} from "../components/compare";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useToast } from "../contexts/ToastContext";
import {
  createSecret,
  fetchKeyVaults,
  fetchKeyvaultsKey,
  fetchSecret,
  fetchSecrets,
  fetchSecretsKey,
  fetchSubscriptions,
  fetchSubscriptionsKey,
} from "../services/azureService";
import type { SecretBundle } from "../types/secrets";

export const Route = createFileRoute("/compare")({
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
    };
  },
  beforeLoad: async () => {
    // Check if user is authenticated before loading this route
    const isAuthenticated = await invoke<boolean>("check_auth");
    if (!isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
});

function CompareLoadingSpinner() {
  return (
    <div className="h-full flex items-center justify-center p-10">
      <LoadingSpinner size="md" />
    </div>
  );
}

function CompareVaults() {
  const {
    sourceVaultUri,
    sourceName,
    targetVaultUri: initialTargetVaultUri,
    targetName: initialTargetName,
    sourceSubscriptionId,
    targetSubscriptionId: initialTargetSubscriptionId,
  } = Route.useSearch();

  const [targetVaultUri, setTargetVaultUri] = useState(initialTargetVaultUri || "");
  const [targetName, setTargetName] = useState(initialTargetName || "");
  const [selectedTargetSubscription, setSelectedTargetSubscription] = useState(
    initialTargetSubscriptionId || sourceSubscriptionId || "",
  );
  const [statusFilter, setStatusFilter] = useState<ComparisonStatus | "all">("all");
  const [createWithValueModal, setCreateWithValueModal] = useState<{
    isOpen: boolean;
    secretName: string;
    suggestedValue?: string;
    targetVault: "source" | "target";
  }>({
    isOpen: false,
    secretName: "",
    suggestedValue: undefined,
    targetVault: "target",
  });

  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // Fetch subscriptions for target vault selection
  const { data: subscriptions = [] } = useSuspenseQuery({
    queryKey: [fetchSubscriptionsKey],
    queryFn: fetchSubscriptions,
  });

  // Fetch keyvaults for the selected target subscription
  const { data: targetKeyvaults = [], isLoading: loadingTargetKeyvaults } = useQuery({
    queryKey: [fetchKeyvaultsKey, selectedTargetSubscription],
    queryFn: () => fetchKeyVaults(selectedTargetSubscription),
    enabled: !!selectedTargetSubscription,
  });

  // Fetch source secrets
  const { data: sourceSecrets = [] } = useSuspenseQuery({
    queryKey: [fetchSecretsKey, sourceVaultUri],
    queryFn: () => fetchSecrets(sourceVaultUri),
  });

  // Fetch target secrets (only when target vault is selected)
  const { data: targetSecrets = [], isLoading: loadingTargetSecrets } = useQuery({
    queryKey: [fetchSecretsKey, targetVaultUri],
    queryFn: () => fetchSecrets(targetVaultUri),
    enabled: !!targetVaultUri,
  });

  // Use custom hook for comparison logic
  const {
    comparedSecrets,
    stats,
    secretValuesLoading,
    secretValuesLoaded,
    secretValuesLoadedCount,
    secretValuesTotalCount,
  } = useCompareSecrets({
    sourceSecrets,
    targetSecrets,
    sourceVaultUri,
    targetVaultUri,
  });

  // Filter secrets based on selected status filter
  const filteredSecrets = useMemo(() => {
    if (statusFilter === "all") return comparedSecrets;
    return comparedSecrets.filter((s) => s.status === statusFilter);
  }, [comparedSecrets, statusFilter]);

  // Create secret mutation
  const createMutation = useMutation({
    mutationFn: ({ name, value }: { name: string; value: string }) =>
      createSecret(targetVaultUri, name, value),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, targetVaultUri] });
      showSuccess(`Secret "${variables.name}" created in target vault`);
    },
    onError: (error, variables) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError(`Failed to create secret "${variables.name}"`, errorMsg);
    },
  });

  // Create secret mutation for source vault
  const createInSourceMutation = useMutation({
    mutationFn: ({ name, value }: { name: string; value: string }) =>
      createSecret(sourceVaultUri, name, value),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [fetchSecretsKey, sourceVaultUri] });
      showSuccess(`Secret "${variables.name}" created in source vault`);
    },
    onError: (error, variables) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showError(`Failed to create secret "${variables.name}"`, errorMsg);
    },
  });

  // Sync a single secret from source to target
  const handleSyncSecret = async (secretName: string) => {
    // First, get the source value if not already loaded
    let sourceValue = queryClient.getQueryData<SecretBundle | null>([
      "secret",
      sourceVaultUri,
      secretName,
    ])?.value;

    if (!sourceValue) {
      try {
        const sourceBundle = await fetchSecret(sourceVaultUri, secretName);
        sourceValue = sourceBundle?.value;
      } catch (_error) {
        showError(`Failed to fetch source value for "${secretName}"`);
        return;
      }
    }

    if (!sourceValue) {
      showError(`No value found for source secret "${secretName}"`);
      return;
    }

    createMutation.mutate({ name: secretName, value: sourceValue });
  };

  // Sync a single secret from target to source
  const handleSyncSecretToSource = async (secretName: string) => {
    // First, get the target value if not already loaded
    let targetValue = queryClient.getQueryData<SecretBundle | null>([
      "secret",
      targetVaultUri,
      secretName,
    ])?.value;

    if (!targetValue) {
      try {
        const targetBundle = await fetchSecret(targetVaultUri, secretName);
        targetValue = targetBundle?.value;
      } catch (_error) {
        showError(`Failed to fetch target value for "${secretName}"`);
        return;
      }
    }

    if (!targetValue) {
      showError(`No value found for target secret "${secretName}"`);
      return;
    }

    createInSourceMutation.mutate({ name: secretName, value: targetValue });
  };

  // Create all missing secrets in target
  const handleSyncAllMissing = async () => {
    const missingSecrets = comparedSecrets.filter((s) => s.status === "source-only");

    for (const secret of missingSecrets) {
      await handleSyncSecret(secret.name);
    }
  };

  // Open modal to create with custom value in target
  const handleCreateWithValue = (secretName: string, suggestedValue?: string) => {
    setCreateWithValueModal({
      isOpen: true,
      secretName,
      suggestedValue,
      targetVault: "target",
    });
  };

  // Open modal to create with custom value in source
  const handleCreateInSource = (secretName: string, suggestedValue?: string) => {
    setCreateWithValueModal({
      isOpen: true,
      secretName,
      suggestedValue,
      targetVault: "source",
    });
  };

  const handleConfirmCreateWithValue = (value: string) => {
    if (createWithValueModal.targetVault === "source") {
      createInSourceMutation.mutate({ name: createWithValueModal.secretName, value });
    } else {
      createMutation.mutate({ name: createWithValueModal.secretName, value });
    }
    setCreateWithValueModal({
      isOpen: false,
      secretName: "",
      suggestedValue: undefined,
      targetVault: "target",
    });
  };

  // Handle target vault selection
  const handleTargetVaultChange = (vaultUri: string) => {
    const vault = targetKeyvaults.find((kv) => kv.properties.vaultUri === vaultUri);
    setTargetVaultUri(vaultUri);
    setTargetName(vault?.name || "");
  };

  const handleSubscriptionChange = (subscriptionId: string) => {
    setSelectedTargetSubscription(subscriptionId);
    setTargetVaultUri("");
    setTargetName("");
  };

  return (
    <Suspense fallback={<CompareLoadingSpinner />}>
      <div className="h-full flex flex-col">
        <CompareHeader
          sourceVaultUri={sourceVaultUri}
          sourceName={sourceName}
          sourceSubscriptionId={sourceSubscriptionId}
          targetName={targetName}
          targetVaultUri={targetVaultUri}
          secretValuesLoading={secretValuesLoading}
          secretValuesLoaded={secretValuesLoaded}
          secretValuesLoadedCount={secretValuesLoadedCount}
          secretValuesTotalCount={secretValuesTotalCount}
          loadingTargetSecrets={loadingTargetSecrets}
          stats={stats}
          onSyncAllMissing={handleSyncAllMissing}
          isSyncing={createMutation.isPending}
        />

        <TargetVaultSelector
          selectedTargetSubscription={selectedTargetSubscription}
          onSubscriptionChange={handleSubscriptionChange}
          subscriptions={subscriptions}
          targetVaultUri={targetVaultUri}
          onVaultChange={handleTargetVaultChange}
          targetKeyvaults={targetKeyvaults}
          loadingTargetKeyvaults={loadingTargetKeyvaults}
          sourceVaultUri={sourceVaultUri}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {!targetVaultUri ? (
            <CompareEmptyState sourceName={sourceName} />
          ) : loadingTargetSecrets ? (
            <div className="text-center py-12">
              <LoadingSpinner size="md" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Loading secrets from {targetName}...
              </p>
            </div>
          ) : (
            <>
              <ComparisonStatsSection
                stats={stats}
                statusFilter={statusFilter}
                onFilterChange={setStatusFilter}
              />

              {/* Active Filter Indicator */}
              {statusFilter !== "all" && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredSecrets.length} of {stats.total} secrets
                  </span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Clear filter
                  </button>
                </div>
              )}

              <ComparisonTable
                secrets={filteredSecrets}
                sourceName={sourceName}
                targetName={targetName}
                onSyncSecret={handleSyncSecret}
                onSyncSecretToSource={handleSyncSecretToSource}
                onCreateWithValue={handleCreateWithValue}
                onCreateInSource={handleCreateInSource}
                isSyncing={createMutation.isPending}
              />

              {filteredSecrets.length === 0 && comparedSecrets.length > 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No secrets match the selected filter
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create with Value Modal */}
      <CreateWithValueModal
        isOpen={createWithValueModal.isOpen}
        onClose={() =>
          setCreateWithValueModal({
            isOpen: false,
            secretName: "",
            suggestedValue: undefined,
            targetVault: "target",
          })
        }
        onConfirm={handleConfirmCreateWithValue}
        secretName={createWithValueModal.secretName}
        suggestedValue={createWithValueModal.suggestedValue}
        isCreating={createMutation.isPending || createInSourceMutation.isPending}
      />
    </Suspense>
  );
}

function CompareError({ error }: { error: Error }) {
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
