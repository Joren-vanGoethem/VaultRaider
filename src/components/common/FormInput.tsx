/**
 * Reusable form input components with consistent styling.
 */
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FormLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}

export function FormLabel({ htmlFor, children, required }: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ children, className = "" }: FormGroupProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

const inputBaseStyles = `
  w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
  bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
  focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent
  disabled:opacity-50 disabled:cursor-not-allowed
`;

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label?: string;
  error?: string;
}

export function FormInput({ id, label, error, className = "", ...props }: FormInputProps) {
  return (
    <FormGroup>
      {label && (
        <FormLabel htmlFor={id} required={props.required}>
          {label}
        </FormLabel>
      )}
      <input
        id={id}
        className={`${inputBaseStyles} ${error ? "border-red-500 focus:ring-red-500" : ""} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </FormGroup>
  );
}

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label?: string;
  error?: string;
  mono?: boolean;
}

export function FormTextarea({
  id,
  label,
  error,
  mono = false,
  className = "",
  ...props
}: FormTextareaProps) {
  return (
    <FormGroup>
      {label && (
        <FormLabel htmlFor={id} required={props.required}>
          {label}
        </FormLabel>
      )}
      <textarea
        id={id}
        className={`
          ${inputBaseStyles}
          ${mono ? "font-mono text-sm" : ""}
          ${error ? "border-red-500 focus:ring-red-500" : ""}
          resize-none
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </FormGroup>
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function FormSelect({
  id,
  label,
  error,
  options,
  placeholder,
  className = "",
  ...props
}: FormSelectProps) {
  return (
    <FormGroup>
      {label && (
        <FormLabel htmlFor={id} required={props.required}>
          {label}
        </FormLabel>
      )}
      <select
        id={id}
        className={`${inputBaseStyles} ${error ? "border-red-500 focus:ring-red-500" : ""} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </FormGroup>
  );
}
