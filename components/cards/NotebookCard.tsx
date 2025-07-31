import React from 'react';
import { BookOpen, Edit2, Archive, ArchiveRestore, Trash2, Check, X } from 'lucide-react';

interface NotebookCardProps {
  id: string;
  name: string;
  color: string;
  noteCount: number;
  archived?: boolean;
  isEditing?: boolean;
  editingName?: string;
  onEditingNameChange?: (name: string) => void;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
  onCancelEdit?: () => void;
}

export function NotebookCard({
  name,
  color,
  noteCount,
  archived = false,
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
              if (e.key === 'Enter') {
                onUpdate?.();
              }
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate?.();
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <Check className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelEdit?.();
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="h-4 w-4 text-gray-700" />
          </button>
        </div>
      ) : (
        <div 
          onClick={() => !archived && onClick?.()}
          className="flex items-center justify-between"
        >
          <div className="flex items-center">
            <BookOpen className="h-4 w-4 text-gray-700 mr-2" />
            <span className="font-semibold text-gray-900">
              {name}
              {archived && " (Archived)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{noteCount} notes</span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Edit2 className="h-4 w-4 text-gray-600" />
                </button>
              )}
              {(onArchive || onRestore) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (archived) {
                      onRestore?.();
                    } else {
                      onArchive?.();
                    }
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title={archived ? "Restore notebook" : "Archive notebook"}
                >
                  {archived ? (
                    <ArchiveRestore className="h-4 w-4 text-gray-600" />
                  ) : (
                    <Archive className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              )}
              {archived && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
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
  );
}