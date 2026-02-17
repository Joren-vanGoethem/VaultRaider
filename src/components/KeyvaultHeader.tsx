import {
	ClockIcon,
	DownloadIcon,
	EyeIcon,
	EyeOffIcon,
	FileJsonIcon,
	GitCompareIcon,
	KeyIcon,
	PlusIcon,
	Trash2,
	UploadIcon,
} from "lucide-react";
import { Button, DropdownButton, DropdownMenu, type DropdownMenuItem, IconButton } from "./common";

interface KeyvaultHeaderProps {
	name: string;
	secretsCount: number;
	loadAll: boolean;
	onLoadAll: () => void;
	onExport: () => void;
	onImport: () => void;
	onCompare: () => void;
	onCreate: () => void;
	onDeleteVault: (() => void) | undefined;
	onViewDeleted?: () => void;
	onViewAuditLogs?: (() => void) | undefined;
  softDeleteEnabled?: boolean;
  showDetails: boolean;
  onToggleDetails: () => void;
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
  onViewAuditLogs,
  softDeleteEnabled,
  showDetails,
  onToggleDetails,
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
    ...(onViewAuditLogs
      ? [
          {
            id: "audit-logs",
            label: "Audit Logs",
            icon: <ClockIcon className="w-4 h-4" />,
            onClick: onViewAuditLogs,
          },
        ]
      : []),
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title Section */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 shrink-0">
            <KeyIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {secretsCount} secret{secretsCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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

          {secretsCount > 0 && (
            <IconButton
              icon={
                showDetails ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />
              }
              label={showDetails ? "Hide secret details" : "Show secret details"}
              variant="secondary"
              size="sm"
              onClick={onToggleDetails}
              title={
                showDetails
                  ? "Hide secret details (Recovery, Created, Updated)"
                  : "Show secret details (Recovery, Created, Updated)"
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
