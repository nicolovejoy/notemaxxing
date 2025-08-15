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
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={fieldId}
        className={`
          w-full px-3 py-2 
          border border-gray-300 rounded-lg 
          focus:ring-2 focus:ring-blue-500 focus:border-transparent 
          text-gray-900 placeholder-gray-500
          disabled:bg-gray-50 disabled:text-gray-500
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
        <p id={`${fieldId}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
}
