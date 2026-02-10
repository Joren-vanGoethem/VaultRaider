import { KeyIcon, SearchIcon } from "lucide-react";

interface SecretsEmptyStateProps {
  type: "no-secrets" | "no-results";
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function SecretsEmptyState({ type, searchQuery, onClearSearch }: SecretsEmptyStateProps) {
  if (type === "no-secrets") {
    return (
      <div className="text-center py-12">
        <KeyIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          No secrets found in this Key Vault
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
          Click "Add Secret" to create your first secret
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <SearchIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
      <p className="text-gray-600 dark:text-gray-400">No secrets match "{searchQuery}"</p>
      <button
        type="button"
        onClick={onClearSearch}
        className="mt-3 text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
      >
        Clear search
      </button>
    </div>
  );
}
