/**
 * Reusable button components with consistent styling.
 * Provides variant-based styling for different button use cases.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoadingSpinner } from "../LoadingSpinner";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-400",
  secondary:
    "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-400",
  danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400",
  ghost:
    "text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-400",
  success: "text-white bg-green-600 hover:bg-green-700 focus:ring-green-500 disabled:bg-green-400",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm whitespace-nowrap",
  md: "px-4 py-2 text-sm whitespace-nowrap",
  lg: "px-6 py-3 text-base whitespace-nowrap",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" />
          {loadingText || children}
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

/**
 * Icon-only button for actions like close, menu, etc.
 */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  className = "",
  ...props
}: IconButtonProps) {
  const iconSizeClasses: Record<ButtonSize, string> = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-3",
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`
        inline-flex items-center justify-center rounded-lg transition-colors
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow
        ${variantClasses[variant]}
        ${iconSizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  );
}
