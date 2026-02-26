import React, { useEffect, useRef, useState } from 'react'
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
  const [focusedButton, setFocusedButton] = useState<'cancel' | 'confirm'>('cancel')
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Reset focus to cancel (safe action) when opening
  useEffect(() => {
    if (isOpen) {
      setFocusedButton('cancel')
      // Defer focus to next frame so the dialog is rendered
      requestAnimationFrame(() => cancelRef.current?.focus())
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (focusedButton === 'confirm') onConfirm()
        else onCancel()
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault()
        setFocusedButton((prev) => {
          const next = prev === 'cancel' ? 'confirm' : 'cancel'
          if (next === 'cancel') cancelRef.current?.focus()
          else confirmRef.current?.focus()
          return next
        })
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown, true)
    }
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onCancel, onConfirm, focusedButton])

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
      <div className="fixed inset-0" onClick={onCancel} />
      <div
        className="relative bg-white rounded-xl shadow-2xl ring-1 ring-black/10 w-full max-w-sm p-6"
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
            ref={cancelRef}
            onClick={onCancel}
            onFocus={() => setFocusedButton('cancel')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            onFocus={() => setFocusedButton('confirm')}
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
