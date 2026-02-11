import { KeyIcon } from "lucide-react";
import { EmptyState, SearchEmptyState } from "./common";

interface SecretsEmptyStateProps {
  type: "no-secrets" | "no-results";
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function SecretsEmptyState({ type, searchQuery, onClearSearch }: SecretsEmptyStateProps) {
  if (type === "no-secrets") {
    return (
      <EmptyState
        icon={<KeyIcon className="w-12 h-12" />}
        title="No secrets found in this Key Vault"
        description="Click 'Add Secret' to create your first secret"
      />
    );
  }

  return (
    <SearchEmptyState searchQuery={searchQuery || ""} onClearSearch={onClearSearch || (() => {})} />
  );
}
