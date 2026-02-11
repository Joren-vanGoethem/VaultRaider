import { useQueries, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle,
  Copy,
  Download,
  Filter,
  Key,
  Loader2,
  Search as SearchIcon,
  X,
  XCircle,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyVault } from "~/types/keyvault.ts";
import type { Secret } from "~/types/secrets.ts";
import { Alert, Button, EmptyState, PageError, PageLoadingSpinner } from "../components/common";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../contexts/ToastContext";
import {
  checkKeyvaultAccess,
  fetchKeyVaults,
  fetchKeyvaultsKey,
  fetchSecret,
  fetchSecrets,
  fetchSubscriptions,
  fetchSubscriptionsKey,
} from "../services/azureService";
import { copyToClipboardWithToast } from "../utils/clipboard";
import { requireAuth } from "../utils/routeGuards";
import { extractSecretName } from "../utils/stringUtils";

const subscriptionQueryOptions = { queryKey: [fetchSubscriptionsKey], queryFn: fetchSubscriptions };

type SearchSearch = {
  query?: string;
};

export const Route = createFileRoute("/search")({
  component: GlobalSearch,
  pendingComponent: PageLoadingSpinner,
  errorComponent: ({ error }) => <PageError error={error} />,
  validateSearch: (search: Record<string, unknown>): SearchSearch => {
    return {
      query: search.query as string | undefined,
    };
  },
  beforeLoad: requireAuth,
  loader: async ({ context: { queryClient } }) => {
    // Prefetch subscriptions
    await queryClient.prefetchQuery(subscriptionQueryOptions);
  },
});

interface SearchResult {
  secretId: string;
  secretName: string;
  vaultName: string;
  vaultUri: string;
  subscriptionId: string;
  subscriptionName: string;
  matchType: "key" | "value" | "both";
  secretValue?: string;
  attributes: Secret["attributes"];
}

function GlobalSearch() {
  const { query: urlQuery } = Route.useSearch();
  const subscriptions = useSuspenseQuery(subscriptionQueryOptions).data || [];
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState(urlQuery || "");
  const [searchType, setSearchType] = useState<"key" | "value" | "both">("key");
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<Set<string>>(
    new Set(subscriptions.map((s) => s.subscriptionId)),
  );
  const [selectedKeyvaults, setSelectedKeyvaults] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0 });

  // Track if keyvaults have been initialized to prevent re-selecting after user deselects
  const keyvaultsInitialized = useRef(false);

  // Fetch all key vaults for all subscriptions
  const keyvaultQueries = useQueries({
    queries: subscriptions.map((sub) => ({
      queryKey: [fetchKeyvaultsKey, sub.subscriptionId],
      queryFn: () => fetchKeyVaults(sub.subscriptionId),
    })),
  });

  // Flatten all keyvaults with their subscription info
  const allKeyvaults = useMemo(() => {
    const keyvaults: Array<KeyVault & { subscriptionId: string; subscriptionName: string }> = [];
    subscriptions.forEach((sub, index) => {
      const data = keyvaultQueries[index]?.data || [];
      data.forEach((kv) => {
        keyvaults.push({
          ...kv,
          subscriptionId: sub.subscriptionId,
          subscriptionName: sub.displayName,
        });
      });
    });
    return keyvaults;
  }, [subscriptions, keyvaultQueries]);

  // Check access for all keyvaults
  const accessQueries = useQueries({
    queries: allKeyvaults.map((kv) => ({
      queryKey: ["keyvault-access", kv.properties.vaultUri],
      queryFn: () => checkKeyvaultAccess(kv.properties.vaultUri),
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    })),
  });

  // Create a map of vault URI to access info
  const accessMap = useMemo(() => {
    const map = new Map<string, { hasAccess: boolean; isLoading: boolean }>();
    allKeyvaults.forEach((kv, index) => {
      const query = accessQueries[index];
      map.set(kv.properties.vaultUri, {
        hasAccess: query?.data?.hasAccess || false,
        isLoading: query?.isLoading || false,
      });
    });
    return map;
  }, [allKeyvaults, accessQueries]);

  // Initialize selected keyvaults when they load - only accessible ones
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally excluding selectedKeyvaults.size and accessQueries to prevent infinite loop
  useEffect(() => {
    // Only initialize once, don't re-run if user has already interacted
    if (keyvaultsInitialized.current) return;

    if (selectedKeyvaults.size === 0 && allKeyvaults.length > 0) {
      // Wait for at least one access check to complete
      const anyAccessChecked = accessQueries.some((q) => !q.isLoading);
      if (!anyAccessChecked) return;

      const accessibleVaults = allKeyvaults.filter((kv) => {
        const access = accessMap.get(kv.properties.vaultUri);
        return access?.hasAccess && !access?.isLoading;
      });

      if (accessibleVaults.length > 0) {
        setSelectedKeyvaults(new Set(accessibleVaults.map((kv) => kv.properties.vaultUri)));
        keyvaultsInitialized.current = true;
      }
    }
  }, [allKeyvaults, accessMap]);

  // Filter keyvaults based on selected subscriptions
  const filteredKeyvaults = useMemo(() => {
    return allKeyvaults.filter((kv) => selectedSubscriptions.has(kv.subscriptionId));
  }, [allKeyvaults, selectedSubscriptions]);

  // Toggle subscription selection
  const toggleSubscription = useCallback((subscriptionId: string) => {
    setSelectedSubscriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subscriptionId)) {
        newSet.delete(subscriptionId);
      } else {
        newSet.add(subscriptionId);
      }
      return newSet;
    });
  }, []);

  // Toggle keyvault selection
  const toggleKeyvault = useCallback((vaultUri: string) => {
    setSelectedKeyvaults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vaultUri)) {
        newSet.delete(vaultUri);
      } else {
        newSet.add(vaultUri);
      }
      return newSet;
    });
  }, []);

  // Select/deselect all subscriptions
  const toggleAllSubscriptions = useCallback(() => {
    if (selectedSubscriptions.size === subscriptions.length) {
      setSelectedSubscriptions(new Set());
    } else {
      setSelectedSubscriptions(new Set(subscriptions.map((s) => s.subscriptionId)));
    }
  }, [selectedSubscriptions.size, subscriptions]);

  // Select/deselect all keyvaults (only accessible ones)
  const toggleAllKeyvaults = useCallback(() => {
    const accessibleVaults = filteredKeyvaults.filter((kv) => {
      const access = accessMap.get(kv.properties.vaultUri);
      return access?.hasAccess && !access?.isLoading;
    });

    const accessibleVaultUris = new Set(accessibleVaults.map((kv) => kv.properties.vaultUri));

    // Check if all accessible vaults are currently selected
    const allAccessibleSelected = accessibleVaults.every((kv) =>
      selectedKeyvaults.has(kv.properties.vaultUri),
    );

    if (allAccessibleSelected && accessibleVaults.length > 0) {
      // Deselect all accessible vaults
      setSelectedKeyvaults(
        new Set(Array.from(selectedKeyvaults).filter((uri) => !accessibleVaultUris.has(uri))),
      );
    } else {
      // Select all accessible vaults (merge with existing selections from other subscriptions)
      setSelectedKeyvaults(
        new Set([...Array.from(selectedKeyvaults), ...Array.from(accessibleVaultUris)]),
      );
    }
  }, [selectedKeyvaults, filteredKeyvaults, accessMap]);

  // Perform the search
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSearchProgress({ current: 0, total: 0 });

    try {
      const results: SearchResult[] = [];
      const searchLower = searchQuery.toLowerCase();

      // Get selected keyvaults to search
      const keyvaultsToSearch = filteredKeyvaults.filter((kv) =>
        selectedKeyvaults.has(kv.properties.vaultUri),
      );

      if (keyvaultsToSearch.length === 0) {
        setIsSearching(false);
        return;
      }

      setSearchProgress({ current: 0, total: keyvaultsToSearch.length });

      // Fetch all secrets from selected keyvaults
      const secretsPromises = keyvaultsToSearch.map(async (kv, index) => {
        try {
          const secrets = await fetchSecrets(kv.properties.vaultUri);
          setSearchProgress((prev) => ({ ...prev, current: index + 1 }));
          return { keyvault: kv, secrets };
        } catch (error) {
          console.error(`Error fetching secrets from ${kv.name}:`, error);
          setSearchProgress((prev) => ({ ...prev, current: index + 1 }));
          return { keyvault: kv, secrets: [] as Secret[] };
        }
      });

      const secretsByVault = await Promise.all(secretsPromises);

      // Search through secrets
      for (const { keyvault, secrets } of secretsByVault) {
        for (const secret of secrets) {
          const secretName = extractSecretName(secret.id);
          const nameMatch = secretName.toLowerCase().includes(searchLower);

          // If searching by key only, check name match
          if (searchType === "key") {
            if (nameMatch) {
              results.push({
                secretId: secret.id,
                secretName,
                vaultName: keyvault.name,
                vaultUri: keyvault.properties.vaultUri,
                subscriptionId: keyvault.subscriptionId,
                subscriptionName: keyvault.subscriptionName,
                matchType: "key",
                attributes: secret.attributes,
              });
            }
          } else {
            // For value or both, we need to fetch the secret value
            try {
              const secretBundle = await fetchSecret(
                keyvault.properties.vaultUri,
                secretName,
                undefined,
              );

              if (secretBundle) {
                const valueMatch = secretBundle.value.toLowerCase().includes(searchLower);

                if (searchType === "value" && valueMatch) {
                  results.push({
                    secretId: secret.id,
                    secretName,
                    vaultName: keyvault.name,
                    vaultUri: keyvault.properties.vaultUri,
                    subscriptionId: keyvault.subscriptionId,
                    subscriptionName: keyvault.subscriptionName,
                    matchType: "value",
                    secretValue: secretBundle.value,
                    attributes: secret.attributes,
                  });
                } else if (searchType === "both" && (nameMatch || valueMatch)) {
                  results.push({
                    secretId: secret.id,
                    secretName,
                    vaultName: keyvault.name,
                    vaultUri: keyvault.properties.vaultUri,
                    subscriptionId: keyvault.subscriptionId,
                    subscriptionName: keyvault.subscriptionName,
                    matchType: nameMatch && valueMatch ? "both" : nameMatch ? "key" : "value",
                    secretValue: secretBundle.value,
                    attributes: secret.attributes,
                  });
                }
              }
            } catch (error) {
              console.error(`Error fetching secret value for ${secretName}:`, error);
              // If we can't fetch the value but name matches in "both" mode, include it
              if (searchType === "both" && nameMatch) {
                results.push({
                  secretId: secret.id,
                  secretName,
                  vaultName: keyvault.name,
                  vaultUri: keyvault.properties.vaultUri,
                  subscriptionId: keyvault.subscriptionId,
                  subscriptionName: keyvault.subscriptionName,
                  matchType: "key",
                  attributes: secret.attributes,
                });
              }
            }
          }
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchType, filteredKeyvaults, selectedKeyvaults]);

  // Handle enter key in search input
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        performSearch();
      }
    },
    [performSearch],
  );

  // Export search results
  const exportResults = useCallback(() => {
    const exportData = searchResults.map((result) => ({
      secretName: result.secretName,
      keyVault: result.vaultName,
      subscription: result.subscriptionName,
      matchType: result.matchType,
      ...(result.secretValue ? { value: result.secretValue } : {}),
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `search-results-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess("Search results exported");
  }, [searchResults, showSuccess]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchProgress({ current: 0, total: 0 });
  }, []);

  const allQueriesLoaded = keyvaultQueries.every((query) => query.isSuccess || query.isError);

  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <div className="h-full px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <PageHeader>Global Secret Search</PageHeader>

          {/* Search Bar */}
          <div className="card mb-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search across all key vaults..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Clear search"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={performSearch}
                  disabled={!searchQuery.trim() || isSearching || !allQueriesLoaded}
                  leftIcon={
                    isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <SearchIcon className="w-4 h-4" />
                    )
                  }
                >
                  {isSearching ? "Searching..." : "Search"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowFilters(!showFilters)}
                  leftIcon={<Filter className="w-4 h-4" />}
                >
                  Filters
                </Button>
              </div>

              {/* Search Type Selection */}
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Search in:
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value="key"
                    checked={searchType === "key"}
                    onChange={(e) => setSearchType(e.target.value as "key" | "value" | "both")}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Secret Names</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value="value"
                    checked={searchType === "value"}
                    onChange={(e) => setSearchType(e.target.value as "key" | "value" | "both")}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Secret Values</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value="both"
                    checked={searchType === "both"}
                    onChange={(e) => setSearchType(e.target.value as "key" | "value" | "both")}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Both</span>
                </label>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Filter Search Scope
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subscriptions Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Subscriptions ({selectedSubscriptions.size} of {subscriptions.length})
                    </h4>
                    <button
                      type="button"
                      onClick={toggleAllSubscriptions}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {selectedSubscriptions.size === subscriptions.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {subscriptions.map((sub) => (
                      <label
                        key={sub.subscriptionId}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubscriptions.has(sub.subscriptionId)}
                          onChange={() => toggleSubscription(sub.subscriptionId)}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {sub.displayName}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Key Vaults Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Key Vaults ({selectedKeyvaults.size} of {filteredKeyvaults.length})
                    </h4>
                    <button
                      type="button"
                      onClick={toggleAllKeyvaults}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {(() => {
                        const accessibleVaults = filteredKeyvaults.filter((kv) => {
                          const access = accessMap.get(kv.properties.vaultUri);
                          return access?.hasAccess && !access?.isLoading;
                        });
                        const allAccessibleSelected = accessibleVaults.every((kv) =>
                          selectedKeyvaults.has(kv.properties.vaultUri),
                        );
                        return allAccessibleSelected && accessibleVaults.length > 0
                          ? "Deselect All"
                          : "Select All";
                      })()}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {filteredKeyvaults.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No key vaults available in selected subscriptions
                      </p>
                    ) : (
                      filteredKeyvaults.map((kv) => {
                        const access = accessMap.get(kv.properties.vaultUri);
                        const isAccessible = access?.hasAccess || false;
                        const isCheckingAccess = access?.isLoading || false;

                        return (
                          <label
                            key={kv.properties.vaultUri}
                            className={`flex items-start gap-2 p-2 rounded ${
                              isAccessible
                                ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                : "cursor-not-allowed opacity-60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedKeyvaults.has(kv.properties.vaultUri)}
                              onChange={() => toggleKeyvault(kv.properties.vaultUri)}
                              disabled={!isAccessible || isCheckingAccess}
                              className="w-4 h-4 mt-0.5 text-primary-600 focus:ring-primary-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                                  {kv.name}
                                </div>
                                {isCheckingAccess ? (
                                  <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" />
                                ) : isAccessible ? (
                                  <div title="Accessible">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                                  </div>
                                ) : (
                                  <div title="No access">
                                    <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {kv.subscriptionName}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Info */}
          {!allQueriesLoaded && (
            <Alert variant="info" className="mb-6">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading key vaults...</span>
              </div>
            </Alert>
          )}

          {selectedKeyvaults.size > 0 && allQueriesLoaded && (
            <Alert variant="info" className="mb-6">
              <div className="text-sm">
                <strong>Search scope:</strong> {selectedKeyvaults.size} key vault
                {selectedKeyvaults.size !== 1 ? "s" : ""} across {selectedSubscriptions.size}{" "}
                subscription{selectedSubscriptions.size !== 1 ? "s" : ""}
              </div>
            </Alert>
          )}

          {/* Results */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Search Results
                {searchResults.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                    ({searchResults.length} result{searchResults.length !== 1 ? "s" : ""})
                  </span>
                )}
              </h2>
              {searchResults.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportResults}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Export Results
                </Button>
              )}
            </div>

            {isSearching && (
              <Alert variant="info" className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Searching key vaults, this can take a while... ({searchProgress.current} of{" "}
                      {searchProgress.total})
                    </span>
                  </div>
                </div>
              </Alert>
            )}

            {searchResults.length === 0 && !isSearching ? (
              <EmptyState
                icon={<SearchIcon className="w-12 h-12" />}
                title={isSearching ? "Searching..." : "No results yet"}
                description={
                  isSearching
                    ? "Searching through your key vaults..."
                    : searchQuery
                      ? "No secrets found matching your search criteria"
                      : "Enter a search query and click Search to find secrets across your key vaults"
                }
              />
            ) : (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div
                    key={`${result.vaultUri}-${result.secretId}`}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                          <h3 className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {result.secretName}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              result.matchType === "key"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : result.matchType === "value"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                            }`}
                          >
                            {result.matchType === "key"
                              ? "Name match"
                              : result.matchType === "value"
                                ? "Value match"
                                : "Both match"}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p>
                            <span className="font-medium">Key Vault:</span> {result.vaultName}
                          </p>
                          <p>
                            <span className="font-medium">Subscription:</span>{" "}
                            {result.subscriptionName}
                          </p>
                          {result.secretValue && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">Value:</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboardWithToast(
                                      result.secretValue || "",
                                      showSuccess,
                                      showError,
                                    )
                                  }
                                  leftIcon={<Copy className="w-3 h-3" />}
                                >
                                  Copy
                                </Button>
                              </div>
                              <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 font-mono text-xs break-all">
                                {result.secretValue.substring(0, 200)}
                                {result.secretValue.length > 200 && "..."}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigate({
                            to: "/keyvault",
                            search: {
                              vaultUri: result.vaultUri,
                              name: result.vaultName,
                              subscriptionId: result.subscriptionId,
                            },
                          });
                        }}
                      >
                        View in Vault
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Suspense>
  );
}
