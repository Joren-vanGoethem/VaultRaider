import {DownloadIcon} from 'lucide-react'
import {LoadingSpinner} from './LoadingSpinner'

interface SecretValueProps {
  value?: string
  isLoading: boolean
  error: string | null
  onLoad: () => void
  onCopy: (text: string) => void
}

export function SecretValue({ value, isLoading, error, onLoad, onCopy }: SecretValueProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-1 mb-2">
        <LoadingSpinner size="sm" />
        <span className="text-xs text-gray-500 dark:text-gray-400">Loading value...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-red-600 dark:text-red-400 py-1 mb-2">
        {error}
      </div>
    )
  }

  if (value) {
    return (
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0 p-1.5 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs break-all max-h-20 overflow-y-auto">
          {value}
        </div>
        <button
          type="button"
          onClick={() => onCopy(value)}
          className="text-xs px-2 py-1.5 rounded bg-gray-500 hover:bg-gray-600 text-white transition-colors font-medium shrink-0"
          title="Copy secret value to clipboard"
        >
          📋
        </button>
      </div>
    )
  }

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={onLoad}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors font-medium"
        title="Load secret value"
      >
        <DownloadIcon className="w-3 h-3" />
        Load Value
      </button>
    </div>
  )
}

