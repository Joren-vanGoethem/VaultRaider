import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchResourceGroups, fetchResourceGroupsKey } from "../services/azureService";
import { LoadingSpinner } from "./LoadingSpinner";

interface CreateKeyvaultModalProps {
  isOpen: boolean;
  onConfirm: (resourceGroup: string, keyvaultName: string) => void;
  onCancel: () => void;
  subscriptionId: string;
  subscriptionName: string;
  isCreating?: boolean;
}

export function CreateKeyvaultModal({
  isOpen,
  onConfirm,
  onCancel,
  subscriptionId,
  subscriptionName,
  isCreating = false,
}: CreateKeyvaultModalProps) {
  const [keyvaultName, setKeyvaultName] = useState("");
  const [selectedResourceGroup, setSelectedResourceGroup] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch resource groups for the selected subscription
  const {
    data: resourceGroups,
    isFetching: isLoadingResourceGroups,
    isError,
    refetch: refetchResourceGroups,
  } = useQuery({
    queryKey: [fetchResourceGroupsKey, subscriptionId],
    queryFn: () => fetchResourceGroups(subscriptionId),
    enabled: isOpen && !!subscriptionId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setKeyvaultName("");
      setSelectedResourceGroup("");
      setValidationError(null);
    }
  }, [isOpen]);

  // Set default resource group when data loads
  useEffect(() => {
    if (resourceGroups && resourceGroups.length > 0 && !selectedResourceGroup) {
      setSelectedResourceGroup(resourceGroups[0].name);
    }
  }, [resourceGroups, selectedResourceGroup]);

  if (!isOpen) return null;

  const validateKeyvaultName = (name: string): string | null => {
    if (!name) return "Key vault name is required";
    if (name.length < 3) return "Key vault name must be at least 3 characters";
    if (name.length > 24) return "Key vault name must be at most 24 characters";
    if (!/^[a-zA-Z]/.test(name)) return "Key vault name must start with a letter";
    if (!/^[a-zA-Z0-9-]+$/.test(name))
      return "Key vault name can only contain letters, numbers, and hyphens";
    if (name.endsWith("-")) return "Key vault name cannot end with a hyphen";
    if (/--/.test(name)) return "Key vault name cannot contain consecutive hyphens";
    return null;
  };

  const handleNameChange = (value: string) => {
    setKeyvaultName(value);
    setValidationError(validateKeyvaultName(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateKeyvaultName(keyvaultName);
    if (error) {
      setValidationError(error);
      return;
    }
    if (!selectedResourceGroup) {
      setValidationError("Please select a resource group");
      return;
    }
    onConfirm(selectedResourceGroup, keyvaultName);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Create New Key Vault
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Create a new Key Vault in <span className="font-medium">{subscriptionName}</span>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Resource Group Selector */}
          <div className="mb-4">
            <label
              htmlFor="resourceGroup"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Resource Group
            </label>
            {isLoadingResourceGroups ? (
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Loading resource groups...
                </span>
              </div>
            ) : isError ? (
              <div className="px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Failed to load resource groups
                  </span>
                  <button
                    type="button"
                    onClick={() => refetchResourceGroups()}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline font-medium"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : resourceGroups && resourceGroups.length === 0 ? (
              <div className="px-3 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-700 dark:text-yellow-400">
                    No resource groups found in this subscription
                  </span>
                  <button
                    type="button"
                    onClick={() => refetchResourceGroups()}
                    className="text-sm text-yellow-700 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 underline font-medium"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <select
                id="resourceGroup"
                value={selectedResourceGroup}
                onChange={(e) => setSelectedResourceGroup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                disabled={isCreating}
                required
              >
                {resourceGroups?.map((rg) => (
                  <option key={rg.id} value={rg.name}>
                    {rg.name} ({rg.location})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Key Vault Name Input */}
          <div className="mb-4">
            <label
              htmlFor="keyvaultName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Key Vault Name
            </label>
            <input
              type="text"
              id="keyvaultName"
              value={keyvaultName}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:border-transparent ${
                validationError
                  ? "border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400"
                  : "border-gray-300 dark:border-gray-600 focus:ring-primary-500 dark:focus:ring-primary-400"
              }`}
              placeholder="my-key-vault"
              disabled={isCreating}
              required
            />
            {validationError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              3-24 characters. Letters, numbers, and hyphens only. Must start with a letter.
            </p>
          </div>

          {/* Location Info */}
          {selectedResourceGroup && resourceGroups && (
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                ℹ️ The Key Vault will be created in the{" "}
                <strong>
                  {resourceGroups.find((rg) => rg.name === selectedResourceGroup)?.location}
                </strong>{" "}
                region.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              disabled={isCreating || !selectedResourceGroup || !!validationError || !keyvaultName}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Key Vault"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
