import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle, Loader2, Trash2, XCircle } from "lucide-react";
import { checkKeyvaultAccess } from "../services/azureService";
import type { KeyVault } from "../types/azure";
import { extractResourceGroup } from "../utils/stringUtils";

interface KeyVaultCardProps {
  vault: KeyVault;
  subscriptionId: string;
  onDelete?: (vault: KeyVault) => void;
}

export function KeyVaultCard({ vault, subscriptionId, onDelete }: KeyVaultCardProps) {
  const { data: accessInfo, isLoading } = useQuery({
    queryKey: ["keyvault-access", vault.properties.vaultUri],
    queryFn: () => checkKeyvaultAccess(vault.properties.vaultUri),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const getAccessIndicator = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-1 text-gray-400" title="Checking access...">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Checking...</span>
        </div>
      );
    }

    if (accessInfo?.hasAccess) {
      return (
        <div
          className="flex items-center gap-1 text-green-600 dark:text-green-400"
          title="Access granted"
        >
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs">Accessible</span>
        </div>
      );
    }

    return (
      <div
        className="flex items-center gap-1 text-red-600 dark:text-red-400"
        title={accessInfo?.errorMessage || "Access denied"}
      >
        <XCircle className="w-4 h-4" />
        <span className="text-xs">No Access</span>
      </div>
    );
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(vault);
    }
  };

  // Extract resource group from vault ID

  const resourceGroup = extractResourceGroup(vault.id);

  return (
    <div className="relative group">
      <Link
        to="/keyvault"
        search={{
          vaultUri: vault.properties.vaultUri,
          name: vault.name,
          subscriptionId,
          resourceGroup,
          enableSoftDelete: vault.properties.enableSoftDelete,
        }}
        className="block p-4 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-md transition-all cursor-pointer"
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {vault.name}
              </h3>
              {getAccessIndicator()}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{vault.location}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-gray-500 dark:text-gray-500">
              {vault.properties.vaultUri}
            </p>
          </div>
        </div>
      </Link>
      {onDelete && (
        <button
          type="button"
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 z-10"
          title="Delete Key Vault"
          aria-label={`Delete ${vault.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
