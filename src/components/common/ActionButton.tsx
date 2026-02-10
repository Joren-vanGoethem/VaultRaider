/**
 * Small action buttons for use in tables and compact spaces.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonVariant = "primary" | "secondary" | "warning" | "purple";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionButtonVariant;
  leftIcon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<ActionButtonVariant, string> = {
  primary:
    "text-primary-700 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50",
  secondary:
    "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600",
  warning:
    "text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50",
  purple:
    "text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50",
};

export function ActionButton({
  variant = "primary",
  leftIcon,
  children,
  className = "",
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`
        inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  );
}
