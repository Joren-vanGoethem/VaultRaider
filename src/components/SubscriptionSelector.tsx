/** biome-ignore-all lint/a11y/noSvgWithoutTitle: dropdown arrow icons */
import { useEffect, useRef, useState } from "react";
import type { Subscription } from "~/types/subscriptions";

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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const selectedSub = subscriptions.find((sub) => sub.subscriptionId === selectedSubscription);

  const getDisplayText = (sub: Subscription) => {
    console.log(sub.subscriptionId, sub.displayName);
    console.log(keyvaultCounts, keyvaultLoadingStates);
    const count = keyvaultCounts.get(sub.subscriptionId) || 0;
    const isLoading = keyvaultLoadingStates.get(sub.subscriptionId) || false;
    const icon = isLoading ? "⏳" : count > 0 ? "✓" : "○";
    const status = isLoading ? "(loading...)" : `(${count} ${count === 1 ? "vault" : "vaults"})`;
    return `${icon} ${sub.displayName} ${status}`;
  };

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={"subscriptionSelector"}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Subscription:
      </label>

      <div ref={dropdownRef} id={"subscriptionSelector"} className="relative min-w-80">
        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-titlenone focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 flex items-center justify-between"
        >
          <span className="truncate">
            {selectedSub ? getDisplayText(selectedSub) : "Select a subscription"}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-100 overflow-auto">
            {subscriptions.map((sub: Subscription) => {
              const isSelected = sub.id === selectedSubscription;

              return (
                <button
                  key={sub.subscriptionId}
                  type="button"
                  onClick={() => {
                    setSelectedSubscription(sub.subscriptionId);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 ${
                    isSelected ? "bg-gray-50 dark:bg-gray-700/50" : ""
                  }`}
                >
                  <span className="text-gray-900 dark:text-gray-100">{getDisplayText(sub)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
