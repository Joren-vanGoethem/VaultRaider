import { GitCompareIcon } from "lucide-react";

interface CompareEmptyStateProps {
  sourceName: string;
}

export function CompareEmptyState({ sourceName }: CompareEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <GitCompareIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Select a target vault to compare
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Choose a subscription and key vault above to compare secrets with {sourceName}
      </p>
    </div>
  );
}
