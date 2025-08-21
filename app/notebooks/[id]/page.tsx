'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FolderOpen, BookOpen, SortAsc, Edit2 } from 'lucide-react'
import { RichTextEditor } from '@/components/RichTextEditor'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Dropdown } from '@/components/ui/Dropdown'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { NoteCard, AddNoteCard } from '@/components/cards/NoteCard'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { SharedIndicator } from '@/components/SharedIndicator'
import { useNoteView, useViewLoading, useViewActions, useViewError } from '@/lib/store/view-store'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toPlainText, toHTML } from '@/lib/utils/content'
import { useAuth } from '@/lib/hooks/useAuth'

type SortOption = 'recent' | 'alphabetical' | 'created'

// Helper to generate title from content
function generateTitleFromContent(content: string): string {
  if (!content) return ''

  // Convert to plain text and get first 50 characters
  const plainText = toPlainText(toHTML(content))
  const words = plainText.split(/\s+/).filter((word) => word.length > 0)

  // Take first 5-7 words or up to 50 characters
  let title = ''
  for (let i = 0; i < Math.min(words.length, 7); i++) {
    const testTitle = title ? `${title} ${words[i]}` : words[i]
    if (testTitle.length > 50) break
    title = testTitle
  }

  return title || 'Untitled Note'
}

export default function NotebookPage() {
  const params = useParams()
  const notebookId = params.id as string
  const { user } = useAuth()

  // Get preview data from sessionStorage for immediate display
  const [previewData, setPreviewData] = useState<{
    name?: string
    color?: string
    note_count?: number
  } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`notebook-preview-${notebookId}`)
      if (stored) {
        setPreviewData(JSON.parse(stored))
        // Clean up after using
        sessionStorage.removeItem(`notebook-preview-${notebookId}`)
      }
    }
  }, [notebookId])

  // Use ViewStore - following the folders page pattern
  const noteView = useNoteView()
  const loading = useViewLoading()
  const error = useViewError()
  const { loadNoteView, clearView } = useViewActions()

  const [search, setSearch] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('recent')
  const [selectedNote, setSelectedNote] = useState<{
    id: string
    title: string
    content?: string
  } | null>(null)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [editingNoteTitle, setEditingNoteTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEditingNotebook, setIsEditingNotebook] = useState(false)
  const [isLoadingNote, setIsLoadingNote] = useState(false)

  // Debounce search input to avoid too many API calls
  const debouncedSearch = useDebounce(search, 300)

  // Track if initial load is done
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // Initial load - only when notebookId changes
  useEffect(() => {
    if (notebookId) {
      loadNoteView(notebookId, {
        search: '',
        sort: 'recent',
      }).then(() => {
        setInitialLoadDone(true)
      })
    }

    // Cleanup on unmount
    return () => {
      clearView()
      setInitialLoadDone(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId]) // Only depend on notebookId, ignore loadNoteView/clearView

  // Filter changes - only after initial load
  useEffect(() => {
    if (initialLoadDone && notebookId) {
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
          title: '', // Start with empty title, will be auto-generated
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
      setEditingNoteTitle('') // Start with empty title, will auto-generate from content
      setEditingNoteContent('')
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
      // Auto-generate title from content if title is empty
      const finalTitle = editingNoteTitle.trim() || generateTitleFromContent(editingNoteContent)

      const response = await fetch('/api/notes', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedNote.id,
          title: finalTitle,
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

  if (loading && !previewData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader />
        <div className="flex h-[calc(100vh-64px)]">
          {/* Sidebar skeleton */}
          <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <Skeleton className="h-4 w-20 mb-4" />
              <div className="flex items-center gap-3 mb-6">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </aside>
          
          {/* Main content skeleton */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-8 w-48" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-48 rounded-lg" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          </main>
        </div>
      </div>
    )
  }
  
  if (!loading && !notebook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Notebook not found</h2>
          <Link href="/backpack" className="text-blue-600 hover:underline">
            Return to backpack
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: 'Backpack', href: '/backpack' },
          ...(noteView?.folder
            ? [{ label: noteView.folder.name, href: `/folders/${noteView.folder.id}` }]
            : []),
          { label: noteView?.notebook?.name || previewData?.name || 'Notebook' },
        ]}
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
                href="/backpack"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Backpack</span>
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
          {/* Notebook Header - Show immediately with preview data */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-lg`}
                style={{ backgroundColor: previewData?.color || notebook?.color || '#e5e7eb' }}
              >
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {isEditingNotebook ? (
                    <InlineEdit
                      value={notebook?.name || ''}
                      onSave={async (newName) => {
                        if (newName !== notebook?.name) {
                          try {
                            const response = await fetch('/api/notebooks', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                id: notebookId,
                                name: newName.trim(),
                              }),
                            })
                            if (response.ok) {
                              // Optimistically update the UI
                              if (noteView && noteView.notebook) {
                                noteView.notebook.name = newName.trim()
                              }
                              await loadNoteView(notebookId, {
                                search: debouncedSearch,
                                sort: sortOption,
                              })
                            }
                          } catch (error) {
                            console.error('Error updating notebook:', error)
                          }
                        }
                        setIsEditingNotebook(false)
                      }}
                      onCancel={() => setIsEditingNotebook(false)}
                      inputClassName="text-2xl font-semibold"
                      className="flex-1"
                    />
                  ) : (
                    <h1 className="text-2xl font-semibold text-gray-900">
                      {previewData?.name || notebook?.name || 'Loading...'}
                    </h1>
                  )}
                  {user && notebook && notebook.owner_id === user.id && !isEditingNotebook && (
                    <button
                      onClick={() => setIsEditingNotebook(true)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit notebook name"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {notebook?.folder_name && !noteView?.folder && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <FolderOpen className="h-4 w-4" />
                    <span>{notebook.folder_name}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Shared indicator for notebooks in shared folders */}
            {notebook && notebook.shared && (
              <SharedIndicator
                shared={true}
                sharedByMe={false}
                permission={notebook.permission}
              />
            )}
          </div>

          {/* Notes Grid */}
          {loading && previewData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-48 rounded-lg" />
              {[...Array(previewData.note_count || 3)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : notes.length === 0 && !search ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Only show Add Note if user owns notebook or has write permission */}
              {(!notebook?.shared || notebook?.permission === 'write') && (
                <AddNoteCard onClick={handleCreateNote} disabled={isSaving} />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Only show Add Note if user owns notebook or has write permission */}
              {(!notebook?.shared || notebook?.permission === 'write') && (
                <AddNoteCard onClick={handleCreateNote} disabled={isSaving} />
              )}
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  content={note.preview}
                  updatedAt={note.updated_at}
                  isSelected={selectedNote?.id === note.id}
                  onClick={async () => {
                    // For read-only users, just show the note without edit mode
                    const canEdit = !notebook?.shared || notebook?.permission === 'write'
                    
                    setIsLoadingNote(true)
                    try {
                      const data = await loadNoteView(notebookId, { noteId: note.id })
                      const fullNote = data?.currentNote
                      if (fullNote) {
                        setSelectedNote(fullNote)
                        if (canEdit) {
                          setIsEditingNote(true)
                          setEditingNoteTitle(fullNote.title)
                          setEditingNoteContent(fullNote.content || '')
                        } else {
                          // For read-only users, selectedNote will trigger the read-only modal
                          setIsEditingNote(false)
                        }
                      }
                    } finally {
                      setIsLoadingNote(false)
                    }
                  }}
                  onEdit={
                    // Only allow edit if user owns notebook or has write permission
                    !notebook?.shared || notebook?.permission === 'write'
                      ? async () => {
                          // Same as onClick - open editor directly
                          setIsLoadingNote(true)
                          try {
                            const data = await loadNoteView(notebookId, { noteId: note.id })
                            const fullNote = data?.currentNote
                            if (fullNote) {
                              setSelectedNote(fullNote)
                              setIsEditingNote(true)
                              setEditingNoteTitle(fullNote.title)
                              setEditingNoteContent(fullNote.content || '')
                            }
                          } finally {
                            setIsLoadingNote(false)
                          }
                        }
                      : undefined
                  }
                  onDelete={
                    // Only show delete button if user owns notebook or has write permission
                    !notebook?.shared || notebook?.permission === 'write'
                      ? () => handleDeleteNote(note.id)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Loading overlay while fetching note */}
      {isLoadingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading note...</span>
          </div>
        </div>
      )}

      {/* Read-only Note Viewer Modal */}
      {selectedNote && !isEditingNote && notebook?.shared && notebook?.permission === 'read' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{selectedNote.title}</h2>
                <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                  Read only
                </span>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: toHTML(selectedNote.content || '') }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Note Editor Modal */}
      {isEditingNote && selectedNote && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onKeyDown={(e) => {
            // Cmd+Enter or Ctrl+Enter to save
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              handleSaveNote()
            }
          }}
        >
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  title="Save (⌘+Enter)"
                >
                  {isSaving ? 'Saving...' : (
                    <>
                      Save
                      <span className="text-xs opacity-75">⌘↵</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <RichTextEditor 
                content={editingNoteContent} 
                onChange={setEditingNoteContent}
                autoFocus={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
