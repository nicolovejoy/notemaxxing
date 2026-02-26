import React from 'react'
import { FileText, GripVertical, Trash2, Edit2 } from 'lucide-react'

interface NoteListItemProps {
  id: string
  title: string
  preview: string
  updatedAt: string
  isSelected?: boolean
  showDragHandle?: boolean
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()

  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const diffTime = nowDay.getTime() - dateDay.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const displayMinutes = minutes.toString().padStart(2, '0')
    return `${displayHours}:${displayMinutes} ${ampm}`
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays > 1 && diffDays < 7) {
    return `${diffDays}d ago`
  } else if (diffDays < 0) {
    return 'Just now'
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }
}

export function NoteListItem({
  title,
  preview,
  updatedAt,
  isSelected,
  showDragHandle,
  onClick,
  onEdit,
  onDelete,
  dragHandleProps,
}: NoteListItemProps) {
  const hasPreview = preview && preview !== 'Empty note'

  return (
    <div
      className={`group flex items-start border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 hover:bg-blue-50' : ''
      }`}
    >
      {/* Drag handle */}
      {showDragHandle && (
        <button
          {...dragHandleProps}
          className="flex-shrink-0 w-11 pt-4 flex items-start justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
          tabIndex={-1}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      {/* Main clickable area */}
      <button
        onClick={onClick}
        className={`flex-1 min-w-0 py-3 text-left ${showDragHandle ? 'pr-2' : 'px-4'}`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">{title || 'Untitled Note'}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{formatDate(updatedAt)}</span>
            {/* Desktop action buttons */}
            <div className="hidden md:flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-500 transition-opacity"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        {hasPreview && (
          <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{preview}</p>
        )}
      </button>
    </div>
  )
}
