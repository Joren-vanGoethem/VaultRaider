import { formatDate } from "./common";

interface SecretAttributesProps {
  recoveryLevel?: string;
  created: number;
  updated: number;
}

export function SecretAttributes({ recoveryLevel, created, updated }: SecretAttributesProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
      {recoveryLevel && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-500">Recovery:</span>
          <span className="text-gray-900 dark:text-gray-100">{recoveryLevel}</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        <span className="text-gray-500 dark:text-gray-500">Created:</span>
        <span className="text-gray-900 dark:text-gray-100">{formatDate(created)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-gray-500 dark:text-gray-500">Updated:</span>
        <span className="text-gray-900 dark:text-gray-100">{formatDate(updated)}</span>
      </div>
    </div>
  );
}
