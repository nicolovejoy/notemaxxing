'use client'

import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
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

  // Update items when notes prop changes (e.g., after server refresh)
  React.useEffect(() => {
    setItems(notes)
  }, [notes])

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  })

  const sensors = useSensors(pointerSensor, touchSensor)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((n) => n.id === active.id)
    const newIndex = items.findIndex((n) => n.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Compute new position as midpoint of neighbors
    let newPosition: number
    if (newIndex === 0) {
      // Moving to the start
      const firstPos = items[0].position ?? 1000
      newPosition = Math.floor(firstPos / 2)
      if (newPosition === 0) newPosition = 1
    } else if (newIndex >= items.length - 1) {
      // Moving to the end
      const lastPos = items[items.length - 1].position ?? items.length * 1000
      newPosition = lastPos + 1000
    } else {
      // Moving between two items
      const beforeIndex = newIndex < oldIndex ? newIndex - 1 : newIndex
      const afterIndex = newIndex < oldIndex ? newIndex : newIndex + 1
      const beforePos = items[beforeIndex].position ?? beforeIndex * 1000
      const afterPos = items[afterIndex].position ?? afterIndex * 1000
      newPosition = Math.floor((beforePos + afterPos) / 2)
    }

    // Optimistic reorder
    const reordered = [...items]
    const [moved] = reordered.splice(oldIndex, 1)
    moved.position = newPosition
    reordered.splice(newIndex, 0, moved)
    setItems(reordered)

    onReorder(active.id as string, newPosition)
  }

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
