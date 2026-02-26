import React, { useEffect } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel, onConfirm])

  if (!isOpen) return null

  const Icon = variant === 'danger' ? Trash2 : AlertTriangle
  const iconBg = variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'
  const iconColor = variant === 'danger' ? 'text-red-600' : 'text-amber-600'
  const confirmBg =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-20" onClick={onCancel} />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${iconBg} flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${confirmBg}`}
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
