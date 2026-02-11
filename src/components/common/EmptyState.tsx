/**
 * Reusable empty state component for displaying when no items are found.
 */
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Generic empty state component with consistent styling.
 */
export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4">{icon}</div>
      <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">{title}</p>
      {description && (
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Empty state for search results.
 */
interface SearchEmptyStateProps {
  searchQuery: string;
  onClearSearch: () => void;
  className?: string;
}

export function SearchEmptyState({
  searchQuery,
  onClearSearch,
  className = "",
}: SearchEmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <svg
        className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <title>Search icon</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <p className="text-gray-600 dark:text-gray-400">No results match "{searchQuery}"</p>
      <button
        type="button"
        onClick={onClearSearch}
        className="mt-3 text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
      >
        Clear search
      </button>
    </div>
  );
}
