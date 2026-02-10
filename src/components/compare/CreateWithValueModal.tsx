import { useEffect, useState } from "react";

interface CreateWithValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  secretName: string;
  suggestedValue?: string;
  isCreating: boolean;
}

export function CreateWithValueModal({
  isOpen,
  onClose,
  onConfirm,
  secretName,
  suggestedValue,
  isCreating,
}: CreateWithValueModalProps) {
  const [value, setValue] = useState(suggestedValue || "");

  useEffect(() => {
    setValue(suggestedValue || "");
  }, [suggestedValue]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-secret-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <h3
          id="create-secret-modal-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
        >
          Create Secret: {secretName}
        </h3>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="secret-value-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Secret Value
            </label>
            <textarea
              id="secret-value-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              rows={4}
              placeholder="Enter secret value..."
            />
          </div>
          {suggestedValue && (
            <button
              type="button"
              onClick={() => setValue(suggestedValue)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              Use source value
            </button>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(value)}
            disabled={!value.trim() || isCreating}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating..." : "Create Secret"}
          </button>
        </div>
      </div>
    </div>
  );
}
