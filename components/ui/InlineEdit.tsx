import React, { useState, useEffect } from 'react'

interface InlineEditProps {
  value: string
  onSave: (value: string) => void
  onCancel: () => void
  className?: string
  inputClassName?: string
  autoFocus?: boolean
  placeholder?: string
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
  const [editValue, setEditValue] = useState(value)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(editValue.trim())
    } else {
      onCancel()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(value)
      onCancel()
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyPress}
        onBlur={handleSave}
        className={`flex-1 bg-transparent border-b-2 border-blue-500 outline-none focus:border-blue-600 ${inputClassName}`}
        autoFocus={autoFocus}
        placeholder={placeholder}
      />
    </div>
  )
}
