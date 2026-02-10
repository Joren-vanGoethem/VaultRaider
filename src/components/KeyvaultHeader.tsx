import {
  DownloadIcon,
  FileJsonIcon,
  GitCompareIcon,
  KeyIcon,
  PlusIcon,
  UploadIcon,
} from "lucide-react";
import { Button } from "./common";

interface KeyvaultHeaderProps {
  name: string;
  secretsCount: number;
  loadAll: boolean;
  onLoadAll: () => void;
  onExport: () => void;
  onImport: () => void;
  onCompare: () => void;
  onCreate: () => void;
}

export function KeyvaultHeader({
  name,
  secretsCount,
  loadAll,
  onLoadAll,
  onExport,
  onImport,
  onCompare,
  onCreate,
}: KeyvaultHeaderProps) {
  return (
    <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <KeyIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {secretsCount} secret{secretsCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {secretsCount > 0 && !loadAll && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onLoadAll}
              leftIcon={<DownloadIcon className="w-4 h-4" />}
              title="Load all secret values"
            >
              Load All
            </Button>
          )}

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          <Button
            variant="secondary"
            size="sm"
            onClick={onExport}
            disabled={secretsCount === 0}
            leftIcon={<FileJsonIcon className="w-4 h-4" />}
            title="Export secrets to JSON"
          >
            Export
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onImport}
            leftIcon={<UploadIcon className="w-4 h-4" />}
            title="Import secrets from file"
          >
            Import
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onCompare}
            leftIcon={<GitCompareIcon className="w-4 h-4" />}
            title="Compare with another vault"
          >
            Compare
          </Button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          <Button
            variant="success"
            size="sm"
            onClick={onCreate}
            leftIcon={<PlusIcon className="w-4 h-4" />}
            title="Add new secret"
          >
            Add Secret
          </Button>
        </div>
      </div>
    </div>
  );
}
