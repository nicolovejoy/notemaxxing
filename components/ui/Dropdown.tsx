import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface DropdownProps {
  label: string
  icon?: React.ReactNode
  options: DropdownOption[]
  value?: string
  onChange: (value: string) => void
  className?: string
  buttonClassName?: string
  menuClassName?: string
}

export function Dropdown({
  label,
  icon,
  options,
  value,
  onChange,
  className = '',
  buttonClassName = '',
  menuClassName = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-raised ${buttonClassName}`}
      >
        {icon}
        {label}
        <ChevronDown className="h-4 w-4" />
      </button>
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-56 bg-surface rounded-lg shadow-lg border border-border py-1 z-10 ${menuClassName}`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-raised flex items-center gap-2 ${
                value === option.value ? 'bg-surface-raised font-medium' : ''
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
