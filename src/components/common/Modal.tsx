/**
 * Base Modal component that provides consistent modal structure.
 * Handles backdrop, centering, click-outside-to-close, and accessibility.
 */
import type { ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** Whether clicking the backdrop should close the modal */
  closeOnBackdropClick?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = "md",
  closeOnBackdropClick = true,
}: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${maxWidthClasses[maxWidth]} w-full mx-4 shadow-xl max-h-[90vh] overflow-auto`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        {children}
      </div>
    </div>
  );
}

// Common modal sub-components for consistent styling
export function ModalTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{children}</h3>
  );
}

export function ModalDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{children}</p>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 justify-end mt-6">{children}</div>;
}
