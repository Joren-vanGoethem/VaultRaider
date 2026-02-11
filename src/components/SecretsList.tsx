import type { Secret } from "../types/secrets";
import { SecretCard } from "./SecretCard";

interface SecretsListProps {
  secrets: Secret[];
  vaultUri: string;
  searchQuery: string;
  shouldLoadAll: boolean;
  selectionMode?: boolean;
  selectedSecrets?: Set<string>;
  onSelectionChange?: (secretId: string, selected: boolean) => void;
  showDetails?: boolean;
}

export function SecretsList({
  secrets,
  vaultUri,
  searchQuery,
  shouldLoadAll,
  selectionMode = false,
  selectedSecrets,
  onSelectionChange,
  showDetails = false,
}: SecretsListProps) {
  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
      {secrets.map((secret) => (
        <SecretCard
          key={secret.id}
          secret={secret}
          vaultUri={vaultUri}
          searchQuery={searchQuery}
          shouldLoad={shouldLoadAll}
          selectionMode={selectionMode}
          isSelected={selectedSecrets?.has(secret.id) ?? false}
          onSelectionChange={onSelectionChange}
          showDetails={showDetails}
        />
      ))}
    </div>
  );
}
