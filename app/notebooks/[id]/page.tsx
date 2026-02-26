'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FolderOpen,
  BookOpen,
  SortAsc,
  SortDesc,
  Edit2,
  Plus,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { RichTextEditor } from '@/components/RichTextEditor'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Dropdown } from '@/components/ui/Dropdown'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { SharedIndicator } from '@/components/SharedIndicator'
import { SortableNoteList } from '@/components/notes/SortableNoteList'
import {
  useNotebookView,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useRenameNotebook,
} from '@/lib/query/hooks'
import { prefetchNotebookView } from '@/lib/query/prefetch'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { toPlainText, toHTML } from '@/lib/utils/content'
import { useAuth } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/firebase/api-fetch'

type SortOption = 'recent' | 'alphabetical' | 'created' | 'manual'
type SortDirection = 'asc' | 'desc'

function getDefaultDirection(sort: SortOption): SortDirection {
  return sort === 'alphabetical' ? 'asc' : 'desc'
}

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
  const queryClient = useQueryClient()

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
        sessionStorage.removeItem(`notebook-preview-${notebookId}`)
      }
    }
  }, [notebookId])

  const [search, setSearch] = useState('')
  const [sortOption, setSortOption] = useState<SortOption | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [sortInitialized, setSortInitialized] = useState(false)
  const [selectedNote, setSelectedNote] = useState<{
    id: string
    title: string
    content?: string
  } | null>(null)
  const [isNewNote, setIsNewNote] = useState(false)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [editingNoteTitle, setEditingNoteTitle] = useState('')
  const [isEditingNotebook, setIsEditingNotebook] = useState(false)
  const [isLoadingNote, setIsLoadingNote] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const originalTitleRef = useRef('')
  const originalContentRef = useRef('')

  // Debounce search input to avoid too many API calls
  const debouncedSearch = useDebounce(search, 300)

  // React Query — data fetching
  const {
    data: noteView,
    isLoading: loading,
    error: queryError,
  } = useNotebookView(notebookId, {
    search: debouncedSearch || undefined,
    sort: sortOption || undefined,
    sortDir:
      sortOption && sortOption !== 'manual'
        ? sortDirection !== getDefaultDirection(sortOption)
          ? sortDirection
          : undefined
        : undefined,
  })

  // Initialize sort from stored notebook preference
  useEffect(() => {
    if (noteView?.notebook?.sort_order && !sortInitialized) {
      const sort = noteView.notebook.sort_order
      setSortOption(sort)
      setSortDirection(getDefaultDirection(sort))
      setSortInitialized(true)
    }
  }, [noteView?.notebook?.sort_order, sortInitialized])
  const error = queryError?.message ?? null

  // Mutations
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote(notebookId)
  const renameNotebook = useRenameNotebook(notebookId)

  const isSaving = createNote.isPending || updateNote.isPending

  // Fetch just a note's content without replacing the note list
  const fetchNoteContent = async (noteId: string) => {
    const response = await apiFetch(`/api/views/notebooks/${notebookId}/notes/${noteId}`, {
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed to load note')
    const data = await response.json()
    return data.currentNote as {
      id: string
      title: string
      content: string
      created_at: string
      updated_at: string
    } | null
  }

  // Open a note for viewing/editing
  const handleOpenNote = async (noteId: string) => {
    setIsLoadingNote(true)
    setIsNewNote(false) // Always clear — opening an existing note is never "new"
    try {
      const fullNote = await fetchNoteContent(noteId)
      if (fullNote) {
        setSelectedNote(fullNote)
        if (canEdit) {
          setIsEditingNote(true)
          setEditingNoteTitle(fullNote.title)
          setEditingNoteContent(fullNote.content || '')
          originalTitleRef.current = fullNote.title
          originalContentRef.current = fullNote.content || ''
        } else {
          setIsEditingNote(false)
        }
      }
    } finally {
      setIsLoadingNote(false)
    }
  }

  // Handle note creation — deferred: opens editor without creating in DB
  const handleCreateNote = useCallback(() => {
    setSelectedNote({ id: '__new__', title: '' })
    setIsNewNote(true)
    setIsEditingNote(true)
    setEditingNoteTitle('')
    setEditingNoteContent('')
    originalTitleRef.current = ''
    originalContentRef.current = ''
  }, [])

  // Handle note save — creates if new, updates if existing
  const handleSaveNote = useCallback(async () => {
    if (!selectedNote || isSaving) return

    try {
      const finalTitle = editingNoteTitle.trim() || generateTitleFromContent(editingNoteContent)

      if (isNewNote) {
        await createNote.mutateAsync({
          title: finalTitle,
          content: editingNoteContent,
          notebook_id: notebookId,
        })
      } else {
        await updateNote.mutateAsync({
          id: selectedNote.id,
          updates: {
            title: finalTitle,
            content: editingNoteContent,
          },
        })
      }

      setIsEditingNote(false)
      setIsNewNote(false)
      setSelectedNote(null)
    } catch (err) {
      console.error('Error saving note:', err)
    }
  }, [
    selectedNote,
    editingNoteTitle,
    editingNoteContent,
    updateNote,
    createNote,
    notebookId,
    isNewNote,
    isSaving,
  ])

  // Handle note deletion — shows confirmation modal
  const handleDeleteNote = (noteId: string) => {
    setConfirmDeleteId(noteId)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    try {
      await deleteNote.mutateAsync(confirmDeleteId)
      if (selectedNote?.id === confirmDeleteId) {
        setSelectedNote(null)
        setIsEditingNote(false)
      }
    } catch (err) {
      console.error('Error deleting note:', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  // Close editor/viewer
  const handleCloseNote = () => {
    setSelectedNote(null)
    setIsEditingNote(false)
    setIsNewNote(false)
  }

  // Handle note reorder — keep as direct apiFetch (fire-and-forget, SortableNoteList handles optimism)
  const handleReorder = async (noteId: string, newPosition: number) => {
    try {
      await apiFetch('/api/notes/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, new_position: newPosition }),
      })
    } catch (err) {
      console.error('Error reordering note:', err)
      queryClient.invalidateQueries({ queryKey: ['notebook-view', notebookId] })
    }
  }

  // Get data from React Query
  const notes = noteView?.notes || []
  const notebook = noteView?.notebook
  const canEdit = !notebook?.shared || notebook?.permission === 'write'

  // Keyboard shortcuts: "n" to create, Escape to close editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close note editor/viewer
      if (e.key === 'Escape' && (isEditingNote || selectedNote) && !showDiscardConfirm) {
        e.preventDefault()
        const hasChanges =
          editingNoteTitle !== originalTitleRef.current ||
          editingNoteContent !== originalContentRef.current
        if (hasChanges) {
          setShowDiscardConfirm(true)
          return
        }
        handleCloseNote()
        return
      }

      // "n" to create a new note
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (!canEdit || isEditingNote || isEditingNotebook) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable)
        return
      e.preventDefault()
      handleCreateNote()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    canEdit,
    isEditingNote,
    isEditingNotebook,
    handleCreateNote,
    selectedNote,
    editingNoteTitle,
    editingNoteContent,
    showDiscardConfirm,
  ])

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
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-4">
                  <Skeleton className="h-4 w-4 flex-shrink-0" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
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
              label={
                {
                  recent: 'Recent',
                  alphabetical: 'A-Z',
                  created: 'Created',
                  manual: 'Manual',
                }[sortOption || 'recent']
              }
              icon={
                sortDirection === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )
              }
              value={sortOption || 'recent'}
              onChange={(value) => {
                const newSort = value as SortOption
                if (newSort === 'manual') {
                  setSortOption(newSort)
                  setSortDirection(getDefaultDirection(newSort))
                } else if (newSort === sortOption) {
                  // Toggle direction on re-click
                  setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                } else {
                  setSortOption(newSort)
                  setSortDirection(getDefaultDirection(newSort))
                }
                setSortInitialized(true)
                // Persist sort preference (fire-and-forget)
                if (newSort !== sortOption) {
                  apiFetch('/api/notebooks', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: notebookId, sort_order: newSort }),
                  }).catch(() => {})
                }
              }}
              options={[
                {
                  value: 'recent',
                  label: 'Recently Updated',
                  icon:
                    sortOption === 'recent' ? (
                      sortDirection === 'desc' ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )
                    ) : undefined,
                },
                {
                  value: 'alphabetical',
                  label: 'Alphabetical',
                  icon:
                    sortOption === 'alphabetical' ? (
                      sortDirection === 'asc' ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )
                    ) : undefined,
                },
                {
                  value: 'created',
                  label: 'Date Created',
                  icon:
                    sortOption === 'created' ? (
                      sortDirection === 'desc' ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )
                    ) : undefined,
                },
                { value: 'manual', label: 'Manual Order' },
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
                    onMouseEnter={() => prefetchNotebookView(queryClient, nb.id)}
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
                          renameNotebook.mutate(newName.trim())
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
                  {user && notebook && notebook.owner_id === user.uid && !isEditingNotebook && (
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
            <div className="flex items-center gap-3">
              {/* Shared indicator for notebooks in shared folders */}
              {notebook && notebook.shared && (
                <SharedIndicator
                  shared={true}
                  sharedByMe={false}
                  permission={notebook.permission as 'read' | 'write' | undefined}
                />
              )}
              {/* Add Note Button — compact, top-right */}
              {canEdit && (
                <button
                  onClick={handleCreateNote}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  New note
                </button>
              )}
            </div>
          </div>

          {/* Notes List */}
          {loading && previewData ? (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {[...Array(previewData.note_count || 3)].map((_, i) => (
                <div key={i} className="py-3 px-4">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : notes.length === 0 && !search ? (
            <div className="text-center py-12 text-gray-500">
              {canEdit ? 'No notes yet. Click "New note" to get started.' : 'No notes yet.'}
            </div>
          ) : notes.length === 0 && search ? (
            <div className="text-center py-12 text-gray-500">
              No notes match &quot;{search}&quot;
            </div>
          ) : (
            <SortableNoteList
              notes={notes}
              canDrag={sortOption === 'manual' && canEdit}
              canEdit={canEdit}
              selectedNoteId={selectedNote?.id}
              onNoteClick={(note) => handleOpenNote(note.id)}
              onNoteEdit={(note) => handleOpenNote(note.id)}
              onNoteDelete={(noteId) => handleDeleteNote(noteId)}
              onReorder={handleReorder}
            />
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
                onClick={handleCloseNote}
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
                  onClick={handleCloseNote}
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
                  {isSaving ? (
                    'Saving...'
                  ) : (
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
        title="Delete Note"
        message="Are you sure? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteNote.isPending}
      />

      {/* Discard Unsaved Changes Confirmation */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onConfirm={() => {
          setShowDiscardConfirm(false)
          handleCloseNote()
        }}
        onCancel={() => setShowDiscardConfirm(false)}
        title="Unsaved Changes"
        message="You have unsaved changes. Discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        variant="warning"
      />
    </div>
  )
}
