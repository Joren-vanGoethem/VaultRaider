import { useMutation, useQueries, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Subscription } from "~/types/subscriptions.ts";
import { CreateKeyvaultModal } from "../components/CreateKeyvaultModal";
import {
  Button,
  EmptyStateAlert,
  LoadingAlert,
  PageError,
  PageLoadingSpinner,
} from "../components/common";
import { KeyvaultsList } from "../components/KeyvaultsList.tsx";
import { PageHeader } from "../components/PageHeader";
import { SubscriptionSelector } from "../components/SubscriptionSelector.tsx";
import { useToast } from "../contexts/ToastContext";
import {
  createKeyvault,
  fetchKeyVaults,
  fetchKeyvaultsKey,
  fetchSubscriptions,
  fetchSubscriptionsKey,
} from "../services/azureService";
import { requireAuth } from "../utils/routeGuards";

const subscriptionQueryOptions = { queryKey: [fetchSubscriptionsKey], queryFn: fetchSubscriptions };

type SubscriptionsSearch = {
  subscriptionId?: string;
};

export const Route = createFileRoute("/subscriptions")({
  component: Subscriptions,
  pendingComponent: PageLoadingSpinner,
  errorComponent: ({ error }) => <PageError error={error} />,
  validateSearch: (search: Record<string, unknown>): SubscriptionsSearch => {
    return {
      subscriptionId: search.subscriptionId as string | undefined,
    };
  },
  beforeLoad: requireAuth,
  loader: async ({ context: { queryClient } }) => {
    // Fetch subscriptions and prefetch key vaults in the background
    // We don't await the key vault queries so the UI shows immediately
    queryClient.prefetchQuery(subscriptionQueryOptions).then((subscriptions) => {
      // Prefetch key vaults for all subscriptions in parallel (non-blocking)
      // TODO@JOREN: do some proper type mapping
      (subscriptions as unknown as Subscription[]).forEach((sub) => {
        queryClient.prefetchQuery({
          queryKey: [fetchKeyvaultsKey, sub.subscriptionId],
          queryFn: () => fetchKeyVaults(sub.subscriptionId),
        });
      });
    });
  },
});

function Subscriptions() {
  const { subscriptionId: urlSubscriptionId } = Route.useSearch();
  const subscriptions = useSuspenseQuery(subscriptionQueryOptions).data || [];
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch all key vaults for all subscriptions
  const keyvaultQueries = useQueries({
    queries: subscriptions.map((sub) => ({
      queryKey: [fetchKeyvaultsKey, sub.subscriptionId],
      queryFn: () => fetchKeyVaults(sub.subscriptionId),
    })),
  });

  // Check if all queries are loaded
  const allQueriesLoaded = keyvaultQueries.every((query) => query.isSuccess || query.isError);
  const anyQueriesLoading = keyvaultQueries.some((query) => query.isLoading);

  // Create a map of subscription ID to key vault count and loading state
  const keyvaultCounts = useMemo(() => {
    const counts = new Map<string, number>();
    subscriptions.forEach((sub, index) => {
      const data = keyvaultQueries[index]?.data || [];
      counts.set(sub.subscriptionId, data.length);
    });
    return counts;
  }, [subscriptions, keyvaultQueries]);

  const keyvaultLoadingStates = useMemo(() => {
    const states = new Map<string, boolean>();
    subscriptions.forEach((sub, index) => {
      states.set(sub.subscriptionId, keyvaultQueries[index]?.isLoading || false);
    });
    return states;
  }, [subscriptions, keyvaultQueries]);

  const defaultSubscriptionId = useMemo(
    () => urlSubscriptionId || subscriptions[0]?.subscriptionId,
    [urlSubscriptionId, subscriptions],
  );

  const [selectedSubscription, setSelectedSubscription] = useState<string | undefined>(
    defaultSubscriptionId,
  );

  // Track if we've done the initial setup
  const isInitialMount = useRef(true);
  const prevUrlSubscriptionIdRef = useRef(urlSubscriptionId);

  // Update selected subscription when URL parameter changes
  useEffect(() => {
    // On initial mount, set the default
    if (isInitialMount.current) {
      if (defaultSubscriptionId) {
        setSelectedSubscription(defaultSubscriptionId);
      }
      isInitialMount.current = false;
      prevUrlSubscriptionIdRef.current = urlSubscriptionId;
    }
    // If URL subscription changed, update to it
    else if (urlSubscriptionId && urlSubscriptionId !== prevUrlSubscriptionIdRef.current) {
      setSelectedSubscription(urlSubscriptionId);
      prevUrlSubscriptionIdRef.current = urlSubscriptionId;
    }
  }, [urlSubscriptionId, defaultSubscriptionId]);

  const selectedSubscriptionName = useMemo(() => {
    return (
      subscriptions.find((s) => s.subscriptionId === selectedSubscription)?.displayName ||
      "Select subscription"
    );
  }, [subscriptions, selectedSubscription]);

  // Mutation for creating a new key vault
  const createKeyvaultMutation = useMutation({
    mutationFn: ({
      resourceGroup,
      keyvaultName,
    }: {
      resourceGroup: string;
      keyvaultName: string;
    }) => {
      if (!selectedSubscription) throw new Error("No subscription selected");
      return createKeyvault(selectedSubscription, resourceGroup, keyvaultName);
    },
    onSuccess: (keyvault) => {
      // Invalidate and refetch keyvaults list for the selected subscription
      queryClient.invalidateQueries({ queryKey: [fetchKeyvaultsKey, selectedSubscription] });
      setShowCreateModal(false);
      showSuccess(`Key Vault "${keyvault?.name}" created successfully`);
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Failed to create key vault:", errorMsg);
      showError("Failed to create Key Vault", errorMsg);
    },
  });

  const handleCreateKeyvault = (resourceGroup: string, keyvaultName: string) => {
    createKeyvaultMutation.mutate({ resourceGroup, keyvaultName });
  };

  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <div className="h-full px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <PageHeader>Azure Key Vaults</PageHeader>

            {/* Subscription Dropdown Selector */}
            {subscriptions.length > 0 && (
              <SubscriptionSelector
                subscriptions={subscriptions}
                selectedSubscription={selectedSubscription}
                setSelectedSubscription={setSelectedSubscription}
                keyvaultCounts={keyvaultCounts}
                keyvaultLoadingStates={keyvaultLoadingStates}
              />
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Key Vaults in {selectedSubscriptionName}
              </h2>
              {selectedSubscription && (
                <Button
                  variant="success"
                  onClick={() => setShowCreateModal(true)}
                  leftIcon={<PlusIcon className="w-4 h-4" />}
                >
                  Create Key Vault
                </Button>
              )}
            </div>

            {anyQueriesLoading && (
              <LoadingAlert
                message="Loading key vaults for all subscriptions..."
                className="mb-4"
              />
            )}

            {allQueriesLoaded &&
              selectedSubscription &&
              keyvaultCounts.get(selectedSubscription) === 0 && (
                <EmptyStateAlert
                  className="mb-4"
                  title="⚠️ No Key Vaults found in this subscription."
                  description="You can create a new Key Vault using the button above, or this could be due to:"
                  suggestions={[
                    "Insufficient permissions to access Key Vaults",
                    "Network or firewall restrictions",
                  ]}
                />
              )}

            {selectedSubscription && <KeyvaultsList subscriptionId={selectedSubscription} />}
          </div>
        </div>
      </div>

      {/* Create Key Vault Modal */}
      {selectedSubscription && (
        <CreateKeyvaultModal
          isOpen={showCreateModal}
          onConfirm={handleCreateKeyvault}
          onCancel={() => setShowCreateModal(false)}
          subscriptionId={selectedSubscription}
          subscriptionName={selectedSubscriptionName}
          isCreating={createKeyvaultMutation.isPending}
        />
      )}
    </Suspense>
  );
}
