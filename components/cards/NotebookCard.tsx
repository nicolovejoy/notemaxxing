import React from 'react'
import { BookOpen, Edit2, Archive, ArchiveRestore, Trash2, Check, X } from 'lucide-react'
import { ShareButton } from '../ShareButton'
import { SharedIndicator } from '../SharedIndicator'
import type { Permission } from '@/lib/types/sharing'

interface NotebookCardProps {
  id: string
  name: string
  color: string
  noteCount: number
  archived?: boolean
  shared?: boolean
  sharedByMe?: boolean
  permission?: Permission
  isEditing?: boolean
  editingName?: string
  onEditingNameChange?: (name: string) => void
  onClick?: () => void
  onEdit?: () => void
  onArchive?: () => void
  onRestore?: () => void
  onDelete?: () => void
  onUpdate?: (newName: string) => void
  onCancelEdit?: () => void
}

export function NotebookCard({
  id,
  name,
  color,
  noteCount,
  archived = false,
  shared = false,
  sharedByMe = false,
  permission,
  isEditing = false,
  editingName = '',
  onEditingNameChange,
  onClick,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onUpdate,
  onCancelEdit,
}: NotebookCardProps) {
  return (
    <div
      className={`${color} ${archived ? 'opacity-60' : ''} rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow group relative`}
    >
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editingName}
            onChange={(e) => onEditingNameChange?.(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-gray-900"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter' && editingName) {
                onUpdate?.(editingName)
              }
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (editingName) {
                onUpdate?.(editingName)
              }
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <Check className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancelEdit?.()
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="h-4 w-4 text-gray-700" />
          </button>
        </div>
      ) : (
        <div onClick={() => !archived && onClick?.()} className="flex items-center justify-between">
          <div className="flex items-center">
            <BookOpen className="h-4 w-4 text-gray-700 mr-2" />
            <span className="font-semibold text-gray-900">
              {name}
              {archived && ' (Archived)'}
            </span>
            {(shared || sharedByMe) && (
              <SharedIndicator
                shared={shared}
                sharedByMe={sharedByMe}
                permission={permission}
                className="ml-2"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{noteCount} notes</span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {!shared && !archived && (
                <ShareButton
                  resourceId={id}
                  resourceType="notebook"
                  resourceName={name}
                  className="p-1 hover:bg-gray-200 rounded"
                />
              )}
              {/* Only show edit button if user owns the notebook or has write permission */}
              {onEdit && (!shared || permission === 'write') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Edit2 className="h-4 w-4 text-gray-600" />
                </button>
              )}
              {/* Only show archive/restore for owned notebooks (not shared) */}
              {(onArchive || onRestore) && !shared && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (archived) {
                      onRestore?.()
                    } else {
                      onArchive?.()
                    }
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title={archived ? 'Restore notebook' : 'Archive notebook'}
                >
                  {archived ? (
                    <ArchiveRestore className="h-4 w-4 text-gray-600" />
                  ) : (
                    <Archive className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              )}
              {/* Only show delete for owned archived notebooks */}
              {archived && onDelete && !shared && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
