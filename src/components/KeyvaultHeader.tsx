import {KeyIcon, DownloadIcon, FileJsonIcon, UploadIcon, GitCompareIcon, PlusIcon} from 'lucide-react'

interface KeyvaultHeaderProps {
  name: string
  secretsCount: number
  loadAll: boolean
  onLoadAll: () => void
  onExport: () => void
  onImport: () => void
  onCompare: () => void
  onCreate: () => void
}

export function KeyvaultHeader({
  name,
  secretsCount,
  loadAll,
  onLoadAll,
  onExport,
  onImport,
  onCompare,
  onCreate
}: KeyvaultHeaderProps) {
  return (
    <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <KeyIcon className="w-6 h-6 text-primary-600 dark:text-primary-400"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {secretsCount} secret{secretsCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {secretsCount > 0 && !loadAll && (
            <button
              type="button"
              onClick={onLoadAll}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Load all secret values"
            >
              <DownloadIcon className="w-4 h-4"/>
              Load All
            </button>
          )}

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"/>

          <button
            type="button"
            onClick={onExport}
            disabled={secretsCount === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export secrets to JSON"
          >
            <FileJsonIcon className="w-4 h-4"/>
            Export
          </button>

          <button
            type="button"
            onClick={onImport}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Import secrets from file"
          >
            <UploadIcon className="w-4 h-4"/>
            Import
          </button>

          <button
            type="button"
            onClick={onCompare}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Compare with another vault"
          >
            <GitCompareIcon className="w-4 h-4"/>
            Compare
          </button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"/>

          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            title="Add new secret"
          >
            <PlusIcon className="w-4 h-4"/>
            Add Secret
          </button>
        </div>
      </div>
    </div>
  )
}
