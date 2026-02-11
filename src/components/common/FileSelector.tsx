/**
 * File selector component for import/export operations.
 * Provides consistent file selection UI across the application.
 */
import { open, save } from "@tauri-apps/plugin-dialog";
import { FolderIcon } from "lucide-react";
import { Button } from "./Button";

interface FileSelectorProps {
  value: string | null;
  onChange: (path: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * File selector for opening files.
 */
export function FileOpenSelector({
  value,
  onChange,
  placeholder = "Select a file...",
  disabled = false,
  className = "",
}: FileSelectorProps) {
  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "JSON Files", extensions: ["json"] },
          { name: "Environment Files", extensions: ["env"] },
          { name: "Text Files", extensions: ["txt"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (selected) {
        onChange(selected);
      }
    } catch (error) {
      console.error("Failed to select file:", error);
    }
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ""}
          readOnly
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
        />
        <Button
          variant="secondary"
          onClick={handleSelectFile}
          disabled={disabled}
          leftIcon={<FolderIcon className="w-4 h-4" />}
        >
          Browse
        </Button>
      </div>
    </div>
  );
}

interface FileSaveSelectorProps extends FileSelectorProps {
  defaultFileName?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

/**
 * File selector for saving files.
 */
export function FileSaveSelector({
  value,
  onChange,
  placeholder = "Select a location to save the file...",
  disabled = false,
  defaultFileName,
  filters = [
    { name: "JSON", extensions: ["json"] },
    { name: "Text", extensions: ["txt", "env"] },
  ],
  className = "",
}: FileSaveSelectorProps) {
  const handleSelectLocation = async () => {
    try {
      const path = await save({
        defaultPath: defaultFileName,
        filters,
      });
      if (path) {
        onChange(path);
      }
    } catch (error) {
      console.error("Failed to select save location:", error);
    }
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ""}
          readOnly
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
        />
        <Button
          variant="secondary"
          onClick={handleSelectLocation}
          disabled={disabled}
          leftIcon={<FolderIcon className="w-4 h-4" />}
        >
          Browse
        </Button>
      </div>
    </div>
  );
}
