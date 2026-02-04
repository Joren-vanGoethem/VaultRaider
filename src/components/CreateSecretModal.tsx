import {useState} from 'react'

interface CreateSecretModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string, value: string) => void
  isCreating: boolean
}

export function CreateSecretModal({isOpen, onClose, onConfirm, isCreating}: CreateSecretModalProps) {
  const [secretName, setSecretName] = useState('')
  const [secretValue, setSecretValue] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!secretName.trim() || !secretValue.trim()) {
      alert('Secret name and value are required')
      return
    }
    onConfirm(secretName, secretValue)
  }

  const handleClose = () => {
    setSecretName('')
    setSecretValue('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Create New Secret
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="secretName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Secret Name
            </label>
            <input
              type="text"
              id="secretName"
              value={secretName}
              onChange={(e) => setSecretName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
              placeholder="my-secret-name"
              disabled={isCreating}
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="secretValue"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Secret Value
            </label>
            <textarea
              id="secretValue"
              value={secretValue}
              onChange={(e) => setSecretValue(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent resize-none"
              placeholder="Enter secret value..."
              disabled={isCreating}
              required
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Secret'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
