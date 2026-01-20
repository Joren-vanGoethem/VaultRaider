import {TrashIcon} from 'lucide-react'

interface SecretHeaderProps {
  name: string
  id: string
  enabled: boolean
  onDelete: () => void
  isDeleting?: boolean
}

export function SecretHeader({ name, id, enabled, onDelete, isDeleting = false }: SecretHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
              {name}
            </h3>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              enabled 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div>
            <button
              type="button"
              onClick={onDelete}
              className="text-xs px-2 py-1.5 rounded bg-red-500 hover:bg-red-600 text-white transition-colors font-medium shrink-0"
              title="Delete secret"
              disabled={isDeleting}
            >
              <TrashIcon className="w-4 h-4"/>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" title={id}>
          {id}
        </p>
      </div>
    </div>
  )
}

