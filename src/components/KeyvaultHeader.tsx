import {
  DownloadIcon,
  FileJsonIcon,
  GitCompareIcon,
  KeyIcon,
  PlusIcon,
  Trash2,
  UploadIcon,
} from "lucide-react";
import type { DropdownMenuItem } from "./common";
import { Button, DropdownButton, DropdownMenu } from "./common";

interface KeyvaultHeaderProps {
  name: string;
  secretsCount: number;
  loadAll: boolean;
  onLoadAll: () => void;
  onExport: () => void;
  onImport: () => void;
  onCompare: () => void;
  onCreate: () => void;
  onViewDeleted?: () => void;
  onDeleteVault?: () => void;
  softDeleteEnabled?: boolean;
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
  onViewDeleted,
  onDeleteVault,
  softDeleteEnabled,
}: KeyvaultHeaderProps) {
  // Dropdown menu items for "More Actions"
  const moreActionsItems: DropdownMenuItem[] = [
    {
      id: "export",
      label: "Export",
      icon: <FileJsonIcon className="w-4 h-4" />,
      onClick: onExport,
      disabled: secretsCount === 0,
    },
    {
      id: "import",
      label: "Import",
      icon: <UploadIcon className="w-4 h-4" />,
      onClick: onImport,
    },
    {
      id: "compare",
      label: "Compare",
      icon: <GitCompareIcon className="w-4 h-4" />,
      onClick: onCompare,
    },
    ...(softDeleteEnabled && onViewDeleted
      ? [
          {
            id: "view-deleted",
            label: "View Deleted",
            icon: <Trash2 className="w-4 h-4" />,
            onClick: onViewDeleted,
          },
        ]
      : []),
    ...(onDeleteVault
      ? [
          {
            id: "delete-vault",
            label: "Delete Vault",
            icon: <Trash2 className="w-4 h-4" />,
            onClick: onDeleteVault,
            variant: "danger" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex flex-col gap-4">
        {/* Title Section */}
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

        {/* Action Buttons Section */}
        <div className="flex flex-wrap items-center gap-2">
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

          <Button
            variant="success"
            size="sm"
            onClick={onCreate}
            leftIcon={<PlusIcon className="w-4 h-4" />}
            title="Add new secret"
          >
            Add Secret
          </Button>

          <DropdownMenu
            trigger={
              <DropdownButton variant="secondary" size="sm">
                More Actions
              </DropdownButton>
            }
            items={moreActionsItems}
            align="right"
          />
        </div>
      </div>
    </div>
  );
}
