import {GitCompareIcon} from 'lucide-react'

interface CompareVaultsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CompareVaultsModal({isOpen, onClose}: CompareVaultsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Compare with Another Vault
        </h3>
        <div className="text-center py-8">
          <GitCompareIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4"/>
          <p className="text-gray-600 dark:text-gray-400">
            Compare functionality coming soon!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            This feature will allow you to compare secrets between vaults, identify missing keys, and sync
            configurations.
          </p>
        </div>
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
