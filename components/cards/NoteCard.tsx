import React from 'react'
import { FileText, Trash2, Edit2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { toPlainText, toHTML } from '@/lib/utils/content'

interface NoteCardProps {
  id: string
  title: string
  content: string
  updatedAt: string
  isSelected?: boolean
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function NoteCard({
  id,
  title,
  content,
  updatedAt,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}: NoteCardProps) {
  // Simple date formatting function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
  }

  return (
    <Card
      onClick={onClick}
      className={`p-6 h-48 flex flex-col group ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <FileText className="h-5 w-5 text-gray-400" />
        <div className="flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-500 transition-opacity"
            >
              <Edit2 className="h-4 w-4" />
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
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{title}</h3>
      <p className="text-sm text-gray-600 line-clamp-3 flex-1">
        {content ? toPlainText(toHTML(content)).substring(0, 150) : 'No content yet...'}
      </p>
      <p className="text-xs text-gray-500 mt-2">{formatDate(updatedAt)}</p>
    </Card>
  )
}

interface AddNoteCardProps {
  onClick: () => void
  disabled?: boolean
}

export function AddNoteCard({ onClick, disabled }: AddNoteCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-gray-400 hover:shadow-md transition-all h-48 flex flex-col items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FileText className="h-8 w-8 text-gray-400 group-hover:text-gray-600 mb-2" />
      <span className="text-gray-600 font-medium">Add new note</span>
    </button>
  )
}
