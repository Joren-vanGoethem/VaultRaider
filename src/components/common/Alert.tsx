/**
 * Alert/Banner components for displaying info, warnings, errors, and success messages.
 */
import type { ReactNode } from "react";
import { LoadingSpinner } from "../LoadingSpinner";

type AlertVariant = "info" | "warning" | "error" | "success";

interface AlertProps {
  variant: AlertVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300",
  warning:
    "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300",
  error:
    "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
  success:
    "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
};

export function Alert({ variant, children, className = "" }: AlertProps) {
  return (
    <div className={`p-3 border rounded-lg ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Alert with a loading spinner - useful for showing loading states with context.
 */
interface LoadingAlertProps {
  message: string;
  className?: string;
}

export function LoadingAlert({ message, className = "" }: LoadingAlertProps) {
  return (
    <Alert variant="info" className={className}>
      <p className="text-sm flex items-center gap-2">
        <LoadingSpinner size="sm" />
        {message}
      </p>
    </Alert>
  );
}

/**
 * Empty state alert - used when no items are found.
 */
interface EmptyStateAlertProps {
  title?: string;
  description?: string | ReactNode;
  suggestions?: string[];
  variant?: AlertVariant;
  className?: string;
}

export function EmptyStateAlert({
  title,
  description,
  suggestions,
  variant = "warning",
  className = "",
}: EmptyStateAlertProps) {
  return (
    <Alert variant={variant} className={className}>
      {title && <p className="text-sm font-medium">{title}</p>}
      {description && (
        <div className="text-sm mt-1">
          {typeof description === "string" ? <p>{description}</p> : description}
        </div>
      )}
      {suggestions && suggestions.length > 0 && (
        <ul className="mt-2 text-sm list-disc list-inside space-y-1 opacity-90">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
}
