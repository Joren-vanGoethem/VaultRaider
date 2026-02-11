import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Database, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/common";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../contexts/ToastContext";
import { requireAuth } from "../utils/routeGuards";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  beforeLoad: requireAuth,
});

interface CacheStats {
  subscriptionsCount: number;
  keyvaultsCount: number;
  resourceGroupsCount: number;
  secretsListCount: number;
  secretValuesCount: number;
}

async function getCacheStats(): Promise<CacheStats> {
  return await invoke("get_cache_stats");
}

async function clearCache(): Promise<string> {
  return await invoke("clear_cache");
}

function SettingsPage() {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const clearCacheMutation = useMutation({
    mutationFn: clearCache,
    onSuccess: async () => {
      // Clear TanStack Query cache
      await queryClient.cancelQueries();
      queryClient.clear();

      showSuccess("Cache cleared successfully");
      // Refresh stats after clearing
      loadCacheStats();
    },
    onError: (error) => {
      showError(`Failed to clear cache: ${error}`);
    },
  });

  const loadCacheStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error("Failed to load cache stats:", error);
      showError("Failed to load cache statistics");
    } finally {
      setIsLoadingStats(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader>Settings</PageHeader>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Caching Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Cache Management
              </h2>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage application cache to improve performance and resolve data sync issues.
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Cache Statistics */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Cache Statistics
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadCacheStats}
                  disabled={isLoadingStats}
                >
                  {isLoadingStats ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load Stats"
                  )}
                </Button>
              </div>

              {cacheStats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Subscriptions</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      {cacheStats.subscriptionsCount}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Key Vaults</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      {cacheStats.keyvaultsCount}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Resource Groups</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      {cacheStats.resourceGroupsCount}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Secrets Lists</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      {cacheStats.secretsListCount}
                    </p>
                  </div>
                  <div className="col-span-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Secret Values</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      {cacheStats.secretValuesCount}
                    </p>
                  </div>
                </div>
              )}

              {!cacheStats && !isLoadingStats && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Click "Load Stats" to view cache statistics
                </p>
              )}
            </div>

            {/* Clear Cache Action */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Clear All Cache
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    This will remove all cached data. Useful if you're experiencing sync issues or
                    stale data.
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => clearCacheMutation.mutate()}
                  disabled={clearCacheMutation.isPending}
                >
                  {clearCacheMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Clear Cache
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
