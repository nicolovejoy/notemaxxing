'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const

  return (
    <div className="px-4 py-2">
      <p className="text-xs text-text-tertiary mb-2">Theme</p>
      <div className="flex gap-1">
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
              theme === value
                ? 'bg-brand-navy text-white'
                : 'text-text-secondary hover:bg-surface-raised'
            }`}
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
