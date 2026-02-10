import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, CheckIcon, CopyIcon, GitCompareIcon } from "lucide-react";
import { Button, IconButton } from "../common";
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
          <IconButton
            icon={<ArrowLeftIcon className="w-5 h-5" />}
            label="Back to vault"
            variant="ghost"
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
          />
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
              <Button
                variant="primary"
                onClick={onSyncAllMissing}
                disabled={isSyncing}
                leftIcon={<CopyIcon className="w-4 h-4" />}
                title="Create all missing secrets in target vault"
              >
                Sync All Missing ({stats.sourceOnly})
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
