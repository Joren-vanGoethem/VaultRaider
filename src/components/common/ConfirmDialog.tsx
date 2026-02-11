/**
 * Reusable confirmation dialog component.
 * Provides consistent confirmation patterns across the application.
 */
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Modal, ModalFooter, ModalTitle } from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "success";
  isLoading?: boolean;
  loadingText?: string;
  showWarningIcon?: boolean;
}

/**
 * Generic confirmation dialog with consistent styling.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
  loadingText = "Processing...",
  showWarningIcon = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {showWarningIcon && (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <ModalTitle>{title}</ModalTitle>
        </div>
      )}
      {!showWarningIcon && <ModalTitle>{title}</ModalTitle>}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={variant}
          onClick={onConfirm}
          disabled={isLoading}
          isLoading={isLoading}
          loadingText={loadingText}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Confirmation dialog with text input verification.
 */
interface ConfirmWithTextProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmationText: string;
  currentText: string;
  onTextChange: (text: string) => void;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export function ConfirmWithText({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmationText,
  currentText,
  onTextChange,
  placeholder,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  loadingText = "Processing...",
}: ConfirmWithTextProps) {
  const isValid = currentText === confirmationText;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isLoading) {
      onConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={!isLoading}>
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1">
          <ModalTitle>{title}</ModalTitle>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="confirmation"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Type <span className="font-semibold">{confirmationText}</span> to confirm:
          </label>
          <input
            id="confirmation"
            type="text"
            value={currentText}
            onChange={(e) => onTextChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
            placeholder={placeholder || confirmationText}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={!isValid || isLoading}
            isLoading={isLoading}
            loadingText={loadingText}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
