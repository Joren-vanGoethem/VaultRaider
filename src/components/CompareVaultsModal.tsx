import {GitCompareIcon} from 'lucide-react'
import {useNavigate} from '@tanstack/react-router'

interface CompareVaultsModalProps {
  isOpen: boolean
  onClose: () => void
  sourceVaultUri: string
  sourceName: string
  sourceSubscriptionId?: string
}

export function CompareVaultsModal({
  isOpen,
  onClose,
  sourceVaultUri,
  sourceName,
  sourceSubscriptionId
}: CompareVaultsModalProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleCompare = () => {
    onClose()
    navigate({
      to: '/compare',
      search: {
        sourceVaultUri,
        sourceName,
        sourceSubscriptionId,
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <h3 id="compare-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Compare with Another Vault
        </h3>
        <div className="text-center py-8">
          <GitCompareIcon className="w-12 h-12 mx-auto text-primary-500 dark:text-primary-400 mb-4"/>
          <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">
            Compare secrets between vaults
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            Select a target vault to compare secrets, identify missing keys, and sync configurations between <strong>{sourceName}</strong> and another vault.
          </p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCompare}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            Start Compare
          </button>
        </div>
      </div>
    </div>
  )
}
