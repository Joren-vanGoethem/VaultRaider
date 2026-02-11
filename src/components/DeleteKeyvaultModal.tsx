import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";

interface DeleteKeyvaultModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  keyvaultName: string;
  isDeleting?: boolean;
}

export function DeleteKeyvaultModal({
  isOpen,
  onConfirm,
  onCancel,
  keyvaultName,
  isDeleting = false,
}: DeleteKeyvaultModalProps) {
  const [confirmationText, setConfirmationText] = useState("");

  if (!isOpen) return null;

  const isConfirmationValid = confirmationText === keyvaultName;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmationValid && !isDeleting) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationText("");
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Delete Key Vault
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This action cannot be undone. This will permanently delete the Key Vault{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">{keyvaultName}</span>{" "}
              and all of its secrets.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="confirmation"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Type <span className="font-semibold">{keyvaultName}</span> to confirm:
            </label>
            <input
              id="confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
              placeholder={keyvaultName}
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmationValid || isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 rounded-md hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete Key Vault"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
