import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import { ActionButton } from "../common";
import { LoadingSpinner } from "../LoadingSpinner";
import type { ComparedSecret, ComparisonStatus } from "./ComparisonTypes";

interface ComparisonTableProps {
  secrets: ComparedSecret[];
  sourceName: string;
  targetName: string;
  onSyncSecret: (secretName: string) => void;
  onSyncSecretToSource: (secretName: string) => void;
  onCreateWithValue: (secretName: string, suggestedValue?: string) => void;
  onCreateInSource: (secretName: string, suggestedValue?: string) => void;
  isSyncing: boolean;
}

function getStatusIcon(status: ComparisonStatus) {
  switch (status) {
    case "match":
      return <CheckIcon className="w-4 h-4 text-green-500" />;
    case "mismatch":
      return <AlertTriangleIcon className="w-4 h-4 text-yellow-500" />;
    case "source-only":
      return <ArrowRightIcon className="w-4 h-4 text-blue-500" />;
    case "target-only":
      return <ArrowLeftIcon className="w-4 h-4 text-purple-500" />;
  }
}

function getStatusBadge(status: ComparisonStatus) {
  const classes = {
    match: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    mismatch: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    "source-only": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    "target-only": "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  };
  const labels = {
    match: "Match",
    mismatch: "Different",
    "source-only": "Missing in Target",
    "target-only": "Missing in Source",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

export function ComparisonTable({
  secrets,
  sourceName,
  targetName,
  onSyncSecret,
  onSyncSecretToSource,
  onCreateWithValue,
  onCreateInSource,
  isSyncing,
}: ComparisonTableProps) {
  if (secrets.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No secrets to compare
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/5">
              Secret Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-2/5">
              {sourceName} (Source)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-2/5">
              {targetName} (Target)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {secrets.map((secret) => {
            const isSourceValueLoading = secret.sourceSecret && !secret.sourceValueFetched;
            const isTargetValueLoading = secret.targetSecret && !secret.targetValueFetched;

            return (
              <tr
                key={secret.name}
                className="hover:bg-gray-50 dark:hover:bg-gray-900/50 align-top"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(secret.status)}
                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                      {secret.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">{getStatusBadge(secret.status)}</td>
                <td className="px-4 py-3">
                  {secret.sourceSecret ? (
                    <div className="text-sm">
                      {secret.sourceValueFetched ? (
                        secret.sourceValue != null && secret.sourceValue !== "" ? (
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono break-all whitespace-pre-wrap block max-h-32 overflow-y-auto">
                            {secret.sourceValue}
                          </code>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 text-xs italic">
                            (empty)
                          </span>
                        )
                      ) : isSourceValueLoading ? (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <LoadingSpinner size="sm" />
                          <span className="text-xs">Loading...</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-xs italic">
                          Failed to load
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {secret.targetSecret ? (
                    <div className="text-sm">
                      {secret.targetValueFetched ? (
                        secret.targetValue != null && secret.targetValue !== "" ? (
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono break-all whitespace-pre-wrap block max-h-32 overflow-y-auto">
                            {secret.targetValue}
                          </code>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 text-xs italic">
                            (empty)
                          </span>
                        )
                      ) : isTargetValueLoading ? (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <LoadingSpinner size="sm" />
                          <span className="text-xs">Loading...</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-xs italic">
                          Failed to load
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {secret.status === "source-only" && (
                      <>
                        <ActionButton
                          variant="primary"
                          onClick={() => onSyncSecret(secret.name)}
                          disabled={isSyncing}
                          leftIcon={<CopyIcon className="w-3 h-3" />}
                          title="Copy secret from source to target"
                        >
                          Sync
                        </ActionButton>
                        <ActionButton
                          variant="secondary"
                          onClick={() =>
                            onCreateWithValue(secret.name, secret.sourceValue ?? undefined)
                          }
                          disabled={isSyncing}
                          leftIcon={<PlusIcon className="w-3 h-3" />}
                          title="Create secret with custom value"
                        >
                          Custom
                        </ActionButton>
                      </>
                    )}
                    {secret.status === "target-only" && (
                      <>
                        <ActionButton
                          variant="purple"
                          onClick={() => onSyncSecretToSource(secret.name)}
                          disabled={isSyncing}
                          leftIcon={<ArrowLeftIcon className="w-3 h-3" />}
                          title="Copy secret from target to source"
                        >
                          Sync
                        </ActionButton>
                        <ActionButton
                          variant="secondary"
                          onClick={() =>
                            onCreateInSource(secret.name, secret.targetValue ?? undefined)
                          }
                          disabled={isSyncing}
                          leftIcon={<PlusIcon className="w-3 h-3" />}
                          title="Create secret in source with custom value"
                        >
                          Custom
                        </ActionButton>
                      </>
                    )}
                    {secret.status === "mismatch" && (
                      <ActionButton
                        variant="warning"
                        onClick={() => onSyncSecret(secret.name)}
                        disabled={isSyncing}
                        leftIcon={<RefreshCwIcon className="w-3 h-3" />}
                        title="Overwrite target with source value"
                      >
                        Update
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
