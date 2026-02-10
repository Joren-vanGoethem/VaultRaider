import { EditIcon, TrashIcon } from "lucide-react";
import { IconButton } from "./common";

interface SecretHeaderProps {
  name: string;
  enabled: boolean;
  onDelete: () => void;
  onEdit?: () => void;
  isDeleting?: boolean;
  hasValue?: boolean;
}

export function SecretHeader({
  name,
  enabled,
  onDelete,
  onEdit,
  isDeleting = false,
  hasValue = false,
}: SecretHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
              {name}
            </h3>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                enabled
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              }`}
            >
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex gap-2">
            {onEdit && hasValue && (
              <IconButton
                icon={<EditIcon className="w-4 h-4" />}
                label="Edit secret"
                variant="primary"
                size="sm"
                onClick={onEdit}
                disabled={isDeleting}
              />
            )}
            <IconButton
              icon={<TrashIcon className="w-4 h-4" />}
              label="Delete secret"
              variant="danger"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
