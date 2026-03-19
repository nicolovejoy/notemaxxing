import React from 'react'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  containerClassName?: string
}

export function FormField({
  label,
  error,
  helperText,
  containerClassName = '',
  className = '',
  id,
  ...inputProps
}: FormFieldProps) {
  // Generate an ID if not provided and label exists
  const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-text-secondary mb-1">
          {label}
        </label>
      )}
      <input
        id={fieldId}
        className={`
          w-full px-3 py-2
          border border-border rounded-lg
          focus:ring-2 focus:ring-brand-navy focus:border-transparent
          bg-surface text-text-primary placeholder-text-muted
          disabled:bg-surface-raised disabled:text-text-tertiary
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
        {...inputProps}
      />
      {error && (
        <p id={`${fieldId}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${fieldId}-helper`} className="mt-1 text-sm text-text-tertiary">
          {helperText}
        </p>
      )}
    </div>
  )
}
