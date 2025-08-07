import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Option[];
  onChange: (value: string) => void;
  containerClassName?: string;
}

export function SelectField({
  label,
  error,
  helperText,
  options,
  onChange,
  containerClassName = '',
  className = '',
  id,
  value,
  ...selectProps
}: SelectFieldProps) {
  // Generate an ID if not provided and label exists
  const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={containerClassName}>
      {label && (
        <label 
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-3 py-2 
          border border-gray-300 rounded-lg 
          focus:ring-2 focus:ring-blue-500 focus:border-transparent 
          text-gray-900 bg-white
          disabled:bg-gray-50 disabled:text-gray-500
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
  );
}