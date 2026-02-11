import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { fetchKeyVaults, fetchKeyvaultsKey } from "../services/azureService";
import type { KeyVault } from "../types/azure";
import { KeyVaultCard } from "./KeyVaultCard";
import { LoadingSpinner } from "./LoadingSpinner";

interface KeyVaultsListProps {
  subscriptionId: string;
  onDelete?: (vault: KeyVault) => void;
}

export function KeyvaultsList({ subscriptionId, onDelete }: KeyVaultsListProps) {
  return (
    <Suspense fallback={<VaultsLoadingSpinner />}>
      <Content subscriptionId={subscriptionId} onDelete={onDelete} />
    </Suspense>
  );
}

function Content({ subscriptionId, onDelete }: KeyVaultsListProps) {
  const { data: keyvaults } = useSuspenseQuery({
    queryKey: [fetchKeyvaultsKey, subscriptionId],
    queryFn: () => fetchKeyVaults(subscriptionId),
  });

  if (keyvaults == null || keyvaults.length === 0) {
    return <div>No Key Vaults found.</div>;
  }

  return (
    <div className="grid gap-4">
      {keyvaults.map((v) => (
        <KeyVaultCard key={v.id} vault={v} subscriptionId={subscriptionId} onDelete={onDelete} />
      ))}
    </div>
  );
}

function VaultsLoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center">
      <LoadingSpinner size="md" />
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading Key Vaults...</p>
    </div>
  );
}
