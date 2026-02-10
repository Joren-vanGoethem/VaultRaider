/**
 * Centralized error component for route-level error boundaries.
 * Use this as errorComponent in route definitions.
 */

interface PageErrorProps {
  error: Error;
  onRetry?: () => void;
}

export function PageError({ error, onRetry }: PageErrorProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="h-full flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error.message}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
