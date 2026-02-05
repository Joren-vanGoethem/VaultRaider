interface BulkDeleteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  secretNames: string[];
  isDeleting?: boolean;
}

export function BulkDeleteModal({
  isOpen,
  onConfirm,
  onCancel,
  secretNames,
  isDeleting = false,
}: BulkDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Delete {secretNames.length} Secret{secretNames.length !== 1 ? "s" : ""}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to delete the following secrets? This action may not be reversible
          depending on vault settings.
        </p>

        <div className="flex-1 overflow-auto mb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {secretNames.map((name) => (
              <li
                key={name}
                className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isDeleting}
          >
            {isDeleting
              ? `Deleting ${secretNames.length}...`
              : `Delete ${secretNames.length} Secret${secretNames.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
