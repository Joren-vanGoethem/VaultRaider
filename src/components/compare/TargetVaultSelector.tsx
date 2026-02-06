import type { KeyVault } from "../../types/keyvault";
import type { Subscription } from "../../types/subscriptions";
import { CustomSelector } from "../CustomSelector";

interface TargetVaultSelectorProps {
  selectedTargetSubscription: string;
  onSubscriptionChange: (value: string) => void;
  subscriptions: Subscription[];
  targetVaultUri: string;
  onVaultChange: (value: string) => void;
  targetKeyvaults: KeyVault[];
  loadingTargetKeyvaults: boolean;
  sourceVaultUri: string;
}

export function TargetVaultSelector({
  selectedTargetSubscription,
  onSubscriptionChange,
  subscriptions,
  targetVaultUri,
  onVaultChange,
  targetKeyvaults,
  loadingTargetKeyvaults,
  sourceVaultUri,
}: TargetVaultSelectorProps) {
  return (
    <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-4">
        <CustomSelector
          label="Target Subscription"
          value={selectedTargetSubscription}
          onChange={onSubscriptionChange}
          options={[
            { value: "", label: "Select subscription..." },
            ...subscriptions.map((sub) => ({
              value: sub.subscriptionId,
              label: sub.displayName,
            })),
          ]}
          placeholder="Select subscription..."
          className="flex-1"
        />

        <CustomSelector
          label="Target Key Vault"
          value={targetVaultUri}
          onChange={onVaultChange}
          options={[
            {
              value: "",
              label: loadingTargetKeyvaults ? "Loading..." : "Select vault...",
            },
            ...targetKeyvaults
              .filter((kv) => kv.properties.vaultUri !== sourceVaultUri)
              .map((kv) => ({
                value: kv.properties.vaultUri,
                label: kv.name,
              })),
          ]}
          placeholder="Select vault..."
          disabled={!selectedTargetSubscription || loadingTargetKeyvaults}
          loading={loadingTargetKeyvaults}
          className="flex-1"
        />
      </div>
    </div>
  );
}
