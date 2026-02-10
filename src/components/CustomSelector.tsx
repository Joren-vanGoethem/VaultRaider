/** biome-ignore-all lint/a11y/noSvgWithoutTitle: dropdown arrow icons */
import { useEffect, useRef, useState } from "react";

interface KeyvaultSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function CustomSelector({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  loading = false,
  className = "",
}: KeyvaultSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = loading ? "Loading..." : selectedOption?.label || placeholder;

  return (
    <div className={className}>
      <label
        htmlFor="keyvaultSelector"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
      </label>

      <div id="keyvaultSelector" ref={dropdownRef} className="relative">
        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center justify-between ${
            disabled || loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <span className={`truncate ${!value ? "text-gray-500 dark:text-gray-400" : ""}`}>
            {displayText}
          </span>
          <svg
            className={`w-5 h-5 transition-transform shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && !loading && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                {placeholder}
              </div>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 ${
                      isSelected ? "bg-gray-50 dark:bg-gray-700/50" : ""
                    }`}
                  >
                    <span className="text-gray-900 dark:text-gray-100">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
