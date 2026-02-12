import { ClipboardIcon, DownloadIcon } from "lucide-react";
import { Button, IconButton } from "./common";
import { LoadingSpinner } from "./LoadingSpinner";

interface SecretValueProps {
  value?: string;
  isLoading: boolean;
  error: string | null;
  onLoad: () => void;
  onCopy: (text: string) => void;
}

export function SecretValue({ value, isLoading, error, onLoad, onCopy }: SecretValueProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-1 mb-2">
        <LoadingSpinner size="sm" />
        <span className="text-xs text-gray-500 dark:text-gray-400">Loading value...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-red-600 dark:text-red-400 py-1 mb-2">{error}</div>;
  }

  if (value !== undefined) {
    return (
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0 p-1.5 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs break-all max-h-20 overflow-y-auto">
          {value || <span className="text-gray-400 dark:text-gray-500 italic">(empty)</span>}
        </div>
        <IconButton
          icon={<ClipboardIcon className="w-3.5 h-3.5" />}
          label="Copy secret value to clipboard"
          variant="secondary"
          size="sm"
          onClick={() => onCopy(value)}
        />
      </div>
    );
  }

  return (
    <div className="mb-2">
      <Button
        variant="primary"
        size="sm"
        onClick={onLoad}
        leftIcon={<DownloadIcon className="w-3 h-3" />}
        title="Load secret value"
      >
        Load Value
      </Button>
    </div>
  );
}
