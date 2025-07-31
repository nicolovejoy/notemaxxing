import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

export function InlineEdit({
  value,
  onSave,
  onCancel,
  className = '',
  inputClassName = '',
  autoFocus = true,
  placeholder = '',
}: InlineEditProps) {
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyPress}
        className={`flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClassName}`}
        autoFocus={autoFocus}
        placeholder={placeholder}
      />
      <button
        onClick={handleSave}
        className="p-1 hover:bg-white/20 rounded"
        type="button"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={onCancel}
        className="p-1 hover:bg-white/20 rounded"
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}