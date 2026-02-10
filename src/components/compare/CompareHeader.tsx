import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, CheckIcon, CopyIcon, GitCompareIcon } from "lucide-react";
import { LoadingSpinner } from "../LoadingSpinner";
import type { ComparisonStats } from "./ComparisonTypes";

interface CompareHeaderProps {
  sourceVaultUri: string;
  sourceName: string;
  sourceSubscriptionId?: string;
  targetName: string;
  targetVaultUri: string;
  secretValuesLoading: boolean;
  secretValuesLoaded: boolean;
  secretValuesLoadedCount: number;
  secretValuesTotalCount: number;
  loadingTargetSecrets: boolean;
  stats: ComparisonStats;
  onSyncAllMissing: () => void;
  isSyncing: boolean;
}

export function CompareHeader({
  sourceVaultUri,
  sourceName,
  sourceSubscriptionId,
  targetName,
  targetVaultUri,
  secretValuesLoading,
  secretValuesLoaded,
  secretValuesLoadedCount,
  secretValuesTotalCount,
  loadingTargetSecrets,
  stats,
  onSyncAllMissing,
  isSyncing,
}: CompareHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/keyvault",
                search: {
                  vaultUri: sourceVaultUri,
                  name: sourceName,
                  subscriptionId: sourceSubscriptionId,
                },
              })
            }
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Back to vault"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <GitCompareIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Compare Vaults</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {sourceName} → {targetName || "Select target vault"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {targetVaultUri && (
          <div className="flex items-center gap-2">
            {/* Loading Status */}
            {secretValuesLoading ? (
              <div className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                <LoadingSpinner size="sm" />
                <span>
                  Loading values... ({secretValuesLoadedCount}/{secretValuesTotalCount})
                </span>
              </div>
            ) : secretValuesLoaded ? (
              <div className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400">
                <CheckIcon className="w-4 h-4" />
                <span>All values loaded</span>
              </div>
            ) : null}

            {/* Only show sync button after target secrets AND values are loaded */}
            {!loadingTargetSecrets && secretValuesLoaded && stats.sourceOnly > 0 && (
              <button
                type="button"
                onClick={onSyncAllMissing}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
                title="Create all missing secrets in target vault"
              >
                <CopyIcon className="w-4 h-4" />
                Sync All Missing ({stats.sourceOnly})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
