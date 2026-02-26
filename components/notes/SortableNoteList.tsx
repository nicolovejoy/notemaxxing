'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { NoteListItem } from '@/components/cards/NoteListItem'

interface NoteItem {
  id: string
  title: string
  preview: string
  created_at: string
  updated_at: string
  position?: number
}

interface SortableNoteListProps {
  notes: NoteItem[]
  canDrag: boolean
  canEdit: boolean
  selectedNoteId?: string
  onNoteClick: (note: NoteItem) => void
  onNoteEdit?: (note: NoteItem) => void
  onNoteDelete?: (noteId: string) => void
  onReorder: (noteId: string, newPosition: number) => void
}

function SortableNoteRow({
  note,
  canDrag,
  canEdit,
  isSelected,
  onNoteClick,
  onNoteEdit,
  onNoteDelete,
}: {
  note: NoteItem
  canDrag: boolean
  canEdit: boolean
  isSelected: boolean
  onNoteClick: () => void
  onNoteEdit?: () => void
  onNoteDelete?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: !canDrag,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <NoteListItem
        id={note.id}
        title={note.title}
        preview={note.preview}
        updatedAt={note.updated_at}
        isSelected={isSelected}
        showDragHandle={canDrag}
        onClick={onNoteClick}
        onEdit={canEdit ? onNoteEdit : undefined}
        onDelete={canEdit ? onNoteDelete : undefined}
        dragHandleProps={canDrag ? { ...listeners } : undefined}
      />
    </div>
  )
}

export function SortableNoteList({
  notes,
  canDrag,
  canEdit,
  selectedNoteId,
  onNoteClick,
  onNoteEdit,
  onNoteDelete,
  onReorder,
}: SortableNoteListProps) {
  const [items, setItems] = useState<NoteItem[]>(notes)
  // Track whether we have a pending optimistic reorder to prevent
  // the notes prop sync from clobbering it
  const reorderPending = useRef(false)

  // Sync from props, but skip if we just did an optimistic reorder
  React.useEffect(() => {
    if (reorderPending.current) {
      reorderPending.current = false
      return
    }
    setItems(notes)
  }, [notes])

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  })

  const sensors = useSensors(pointerSensor, touchSensor)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (!over || active.id === over.id) return

      setItems((prev) => {
        const oldIndex = prev.findIndex((n) => n.id === active.id)
        const newIndex = prev.findIndex((n) => n.id === over.id)

        if (oldIndex === -1 || newIndex === -1) return prev

        const reordered = arrayMove(prev, oldIndex, newIndex)

        // Compute new position as midpoint of neighbors in the NEW array
        let newPosition: number
        if (newIndex === 0) {
          const nextPos = reordered[1]?.position ?? 2000
          newPosition = Math.max(1, Math.floor(nextPos / 2))
        } else if (newIndex >= reordered.length - 1) {
          const prevPos = reordered[reordered.length - 2]?.position ?? (reordered.length - 1) * 1000
          newPosition = prevPos + 1000
        } else {
          const prevPos = reordered[newIndex - 1]?.position ?? (newIndex - 1) * 1000
          const nextPos = reordered[newIndex + 1]?.position ?? (newIndex + 1) * 1000
          newPosition = Math.floor((prevPos + nextPos) / 2)
        }

        // Update position on the moved item
        reordered[newIndex] = { ...reordered[newIndex], position: newPosition }

        // Mark that we have an optimistic update, so the useEffect skips the next notes sync
        reorderPending.current = true

        // Fire the API call
        onReorder(active.id as string, newPosition)

        return reordered
      })
    },
    [onReorder]
  )

  if (!canDrag) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {items.map((note) => (
          <NoteListItem
            key={note.id}
            id={note.id}
            title={note.title}
            preview={note.preview}
            updatedAt={note.updated_at}
            isSelected={selectedNoteId === note.id}
            showDragHandle={false}
            onClick={() => onNoteClick(note)}
            onEdit={canEdit ? () => onNoteEdit?.(note) : undefined}
            onDelete={canEdit ? () => onNoteDelete?.(note.id) : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {items.map((note) => (
            <SortableNoteRow
              key={note.id}
              note={note}
              canDrag={canDrag}
              canEdit={canEdit}
              isSelected={selectedNoteId === note.id}
              onNoteClick={() => onNoteClick(note)}
              onNoteEdit={() => onNoteEdit?.(note)}
              onNoteDelete={() => onNoteDelete?.(note.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
