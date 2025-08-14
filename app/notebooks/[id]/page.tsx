'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FolderOpen,
  BookOpen,
  SortAsc,
} from 'lucide-react'
import { RichTextEditor } from '@/components/RichTextEditor'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Dropdown } from '@/components/ui/Dropdown'
import { NoteCard, AddNoteCard } from '@/components/cards/NoteCard'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { useNoteView, useViewLoading, useViewActions, useViewError } from '@/lib/store/view-store'
import { useDebounce } from '@/lib/hooks/useDebounce'

type SortOption = 'recent' | 'alphabetical' | 'created'

export default function NotebookPage() {
  const params = useParams()
  const notebookId = params.id as string

  // Debug counters
  const renderCount = useRef(0)
  const loadCount = useRef(0)
  console.log(`[NotebookPage] Render #${++renderCount.current}, notebookId: ${notebookId}`)

  // Use ViewStore - following the folders page pattern
  const noteView = useNoteView()
  const loading = useViewLoading()
  const error = useViewError()
  const { loadNoteView, clearView } = useViewActions()

  const [search, setSearch] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('recent')
  const [selectedNote, setSelectedNote] = useState<{ id: string; title: string; content?: string } | null>(null)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [editingNoteTitle, setEditingNoteTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Debounce search input to avoid too many API calls
  const debouncedSearch = useDebounce(search, 300)

  // Track if initial load is done
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // Initial load - only when notebookId changes
  useEffect(() => {
    console.log(`[NotebookPage] Initial load effect, count: ${++loadCount.current}`)
    if (notebookId) {
      console.log(`[NotebookPage] Loading notebook: ${notebookId}`)
      loadNoteView(notebookId, {
        search: '',
        sort: 'recent',
      }).then(() => {
        console.log(`[NotebookPage] Initial load complete`)
        setInitialLoadDone(true)
      })
    }

    // Cleanup on unmount
    return () => {
      console.log(`[NotebookPage] Unmounting, clearing view`)
      clearView()
      setInitialLoadDone(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId]) // Only depend on notebookId, ignore loadNoteView/clearView

  // Filter changes - only after initial load
  useEffect(() => {
    if (initialLoadDone && notebookId) {
      console.log(`[NotebookPage] Filter change effect:`, { debouncedSearch, sortOption })
      loadNoteView(notebookId, {
        search: debouncedSearch,
        sort: sortOption,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sortOption, initialLoadDone, notebookId]) // Ignore loadNoteView

  // Handle note creation
  const handleCreateNote = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Note',
          content: '',
          notebook_id: notebookId,
        }),
      })

      if (!response.ok) throw new Error('Failed to create note')

      const newNote = await response.json()

      // Reload the view to get updated list with current filters
      await loadNoteView(notebookId, {
        search: debouncedSearch,
        sort: sortOption,
      })

      // Open the new note for editing
      setSelectedNote(newNote)
      setIsEditingNote(true)
      setEditingNoteTitle(newNote.title)
      setEditingNoteContent(newNote.content || '')
    } catch (err) {
      console.error('Error creating note:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle note update
  const handleSaveNote = async () => {
    if (!selectedNote) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedNote.id,
          title: editingNoteTitle,
          content: editingNoteContent,
        }),
      })

      if (!response.ok) throw new Error('Failed to save note')

      // Reload the view to get updated data with current filters
      await loadNoteView(notebookId, {
        search: debouncedSearch,
        sort: sortOption,
      })
      setIsEditingNote(false)
    } catch (err) {
      console.error('Error saving note:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle note deletion
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/notes?id=${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to delete note')

      // Clear selection if deleted note was selected
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
        setIsEditingNote(false)
      }

      // Reload the view with current filters
      await loadNoteView(notebookId, {
        search: debouncedSearch,
        sort: sortOption,
      })
    } catch (err) {
      console.error('Error deleting note:', err)
    }
  }

  // Get data from store (already filtered and sorted by server)
  const notes = noteView?.notes || []
  const notebook = noteView?.notebook

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <StatusMessage type="error" message={error} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!notebook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Notebook not found</h2>
          <Link href="/folders" className="text-blue-600 hover:underline">
            Return to folders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        backUrl="/folders"
        rightContent={
          <div className="flex items-center gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search notes..."
              className="w-64"
            />
            <Dropdown
              label="Sort"
              icon={<SortAsc className="h-4 w-4" />}
              value={sortOption}
              onChange={(value) => setSortOption(value as SortOption)}
              options={[
                { value: 'recent', label: 'Recently Updated' },
                { value: 'alphabetical', label: 'Alphabetical' },
                { value: 'created', label: 'Date Created' },
              ]}
            />
          </div>
        }
      />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        {noteView?.folder && (
          <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              {/* Folder Header */}
              <Link
                href="/folders"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>All Folders</span>
              </Link>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg" style={{ backgroundColor: noteView.folder.color }}>
                  <FolderOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{noteView.folder.name}</h2>
                  <p className="text-xs text-gray-500">
                    {noteView.siblingNotebooks.length} notebooks
                  </p>
                </div>
              </div>

              {/* Notebooks List */}
              <div className="space-y-1">
                {noteView.siblingNotebooks.map((nb) => (
                  <Link
                    key={nb.id}
                    href={`/notebooks/${nb.id}`}
                    className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                      nb.id === notebookId ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: nb.color }}
                    />
                    <span className="text-sm font-medium truncate">{nb.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Notebook Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: notebook.color }}>
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{notebook.name}</h1>
                {notebook.folder_name && !noteView?.folder && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <FolderOpen className="h-4 w-4" />
                    <span>{notebook.folder_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes Grid */}
          {notes.length === 0 && !search ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AddNoteCard onClick={handleCreateNote} disabled={isSaving} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AddNoteCard onClick={handleCreateNote} disabled={isSaving} />
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  content={note.preview}
                  updatedAt={note.updated_at}
                  isSelected={selectedNote?.id === note.id}
                  onClick={() => {
                    setSelectedNote(note)
                    setEditingNoteTitle(note.title)
                    setEditingNoteContent('')
                  }}
                  onEdit={async () => {
                    // Load full note content via ViewStore
                    await loadNoteView(notebookId, { noteId: note.id })
                    const fullNote = noteView?.currentNote
                    if (fullNote) {
                      setSelectedNote(fullNote)
                      setIsEditingNote(true)
                      setEditingNoteTitle(fullNote.title)
                      setEditingNoteContent(fullNote.content || '')
                    }
                  }}
                  onDelete={() => handleDeleteNote(note.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Note Editor Modal */}
      {isEditingNote && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <input
                type="text"
                value={editingNoteTitle}
                onChange={(e) => setEditingNoteTitle(e.target.value)}
                className="text-xl font-semibold bg-transparent border-none outline-none flex-1"
                placeholder="Note title..."
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingNote(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <RichTextEditor content={editingNoteContent} onChange={setEditingNoteContent} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
