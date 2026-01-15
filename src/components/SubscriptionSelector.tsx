import type { Subscription } from '../types/azure'

interface SubscriptionSelectorProps {
  subscriptions: Subscription[]
  selectedSubscription: string | undefined
  onSubscriptionChange: (subscriptionId: string) => void
}

export function SubscriptionSelector({
  subscriptions,
  selectedSubscription,
  onSubscriptionChange,
}: SubscriptionSelectorProps) {
  return (
    <div className="mb-6">
      <label
        htmlFor="subscription-select"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Select Subscription
      </label>
      <select
        id="subscription-select"
        value={selectedSubscription ?? ''}
        onChange={(e) => onSubscriptionChange(e.target.value)}
        className="w-full p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
      >
        {subscriptions.map((sub) => (
          <option key={sub.id} value={sub.subscriptionId}>
            {sub.displayName} ({sub.subscriptionId})
          </option>
        ))}
      </select>
    </div>
  )
}

