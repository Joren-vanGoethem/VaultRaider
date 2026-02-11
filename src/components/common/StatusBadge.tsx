/**
 * Reusable status badge component with consistent styling.
 * Used for displaying status indicators across the application.
 */
import type { ReactNode } from "react";

type StatusVariant =
  | "enabled"
  | "disabled"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "deleted"
  | "neutral";

interface StatusBadgeProps {
  variant: StatusVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  enabled: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  disabled: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  success: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  error: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  warning: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  deleted: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300",
  neutral: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
};

/**
 * Badge component for displaying status with consistent styling.
 */
export function StatusBadge({ variant, children, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Badge for enabled/disabled status.
 */
interface EnabledBadgeProps {
  enabled: boolean;
  className?: string;
}

export function EnabledBadge({ enabled, className = "" }: EnabledBadgeProps) {
  return (
    <StatusBadge variant={enabled ? "enabled" : "disabled"} className={className}>
      {enabled ? "Enabled" : "Disabled"}
    </StatusBadge>
  );
}
