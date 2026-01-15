import type { KeyVault } from '../types/azure'

interface KeyVaultCardProps {
  vault: KeyVault
}

export function KeyVaultCard({ vault }: KeyVaultCardProps) {
  return (
    <div
      className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {vault.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {vault.location}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-gray-500 dark:text-gray-500">
            {vault.properties.vaultUri}
          </p>
        </div>
      </div>
    </div>
  )
}

