/** biome-ignore-all lint/a11y/noSvgWithoutTitle: dropdown arrow icons */
import type { Subscription } from "~/types/subscriptions";
import { Dropdown } from "./common";

interface SubscriptionSelectorProps {
  subscriptions: Subscription[];
  selectedSubscription: string | undefined;
  setSelectedSubscription: (subscriptionId: string) => void;
  keyvaultCounts: Map<string, number>;
  keyvaultLoadingStates: Map<string, boolean>;
}

export function SubscriptionSelector({
  subscriptions,
  selectedSubscription,
  setSelectedSubscription,
  keyvaultCounts,
  keyvaultLoadingStates,
}: SubscriptionSelectorProps) {
  const getDisplayText = (sub: Subscription) => {
    const count = keyvaultCounts.get(sub.subscriptionId) || 0;
    const isLoading = keyvaultLoadingStates.get(sub.subscriptionId) || false;
    const icon = isLoading ? "⏳" : count > 0 ? "✓" : "○";
    const status = isLoading ? "(loading...)" : `(${count} ${count === 1 ? "vault" : "vaults"})`;
    return `${icon} ${sub.displayName} ${status}`;
  };

  const options = subscriptions.map((sub) => ({
    value: sub.subscriptionId,
    label: getDisplayText(sub),
  }));

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="subscriptionSelector"
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Subscription:
      </label>

      <Dropdown
        id="subscriptionSelector"
        value={selectedSubscription || ""}
        onChange={setSelectedSubscription}
        options={options}
        placeholder="Select a subscription"
        className="min-w-80"
      />
    </div>
  );
}
