/**
 * Date formatting utilities and components.
 * Centralizes date display logic used across the application.
 */

/**
 * Format a Unix timestamp to a localized date string.
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a Unix timestamp to a short date string (no time).
 */
export function formatDateShort(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a Unix timestamp to ISO date string.
 */
export function formatDateISO(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

interface DateDisplayProps {
  timestamp: number;
  format?: "full" | "short" | "iso";
  className?: string;
}

/**
 * Component for displaying formatted dates.
 */
export function DateDisplay({ timestamp, format = "full", className = "" }: DateDisplayProps) {
  const formatters = {
    full: formatDate,
    short: formatDateShort,
    iso: formatDateISO,
  };

  return <span className={className}>{formatters[format](timestamp)}</span>;
}
