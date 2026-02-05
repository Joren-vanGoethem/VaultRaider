import {SearchIcon, XIcon} from 'lucide-react'

interface KeyvaultSearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  totalCount: number
  filteredCount: number
}

export function KeyvaultSearchBar({
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount
}: KeyvaultSearchBarProps) {
  return (
    <div className="w-full">
      <div className="relative max-w-xl">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"/>
        <input
          type="text"
          placeholder="Search secrets by name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2.5 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Clear search"
          >
            <XIcon className="w-4 h-4"/>
          </button>
        )}
      </div>
      {searchQuery && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredCount} of {totalCount} secret{totalCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
