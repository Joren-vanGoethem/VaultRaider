/**
 * Progress bar component for displaying progress of long-running operations.
 */

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  variant?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

const variantColors = {
  primary: "bg-primary-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
};

/**
 * Progress bar with percentage display.
 */
export function ProgressBar({
  current,
  total,
  label,
  showPercentage = true,
  variant = "primary",
  className = "",
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2 text-sm">
          {label && <span className="text-gray-700 dark:text-gray-300">{label}</span>}
          {showPercentage && (
            <span className="text-gray-500 dark:text-gray-400">
              {current} / {total} ({percentage}%)
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${variantColors[variant]} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Indeterminate progress bar for unknown duration operations.
 */
export function IndeterminateProgressBar({
  label,
  variant = "primary",
  className = "",
}: {
  label?: string;
  variant?: "primary" | "success" | "warning" | "danger";
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">{label}</div>}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`${variantColors[variant]} h-2 rounded-full animate-pulse`}
          style={{ width: "40%" }}
        />
      </div>
    </div>
  );
}
