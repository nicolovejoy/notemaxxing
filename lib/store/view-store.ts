import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// Track ongoing requests to prevent duplicates
let currentNoteViewRequest: AbortController | null = null

// View-specific data types
export interface FoldersViewData {
  folders: Array<{
    id: string
    name: string
    color: string
    created_at: string
    updated_at: string
    notebook_count: number
    archived_count: number
    note_count: number
    last_activity: string | null
    shared?: boolean
    permission?: 'read' | 'write'
    most_recent_notebook_id?: string | null
    // Add notebooks array with just metadata
    notebooks?: Array<{
      id: string
      name: string
      color: string
      note_count: number
    }>
  }>
  orphanedNotebooks: Array<{
    id: string
    name: string
    color: string
    note_count: number
    shared_by: string
    permission: 'read' | 'write'
  }>
  stats: {
    total_folders: number
    total_notebooks: number
    total_notes: number
    total_archived: number
  }
}

export interface NotebookViewData {
  folder: {
    id: string
    name: string
    color: string
  }
  notebooks: Array<{
    id: string
    name: string
    color: string
    folder_id: string
    created_at: string
    updated_at: string
    note_count: number
    last_note_date: string | null
    archived: boolean
  }>
  pagination: {
    total: number
    offset: number
    limit: number
    hasMore: boolean
  }
}

export interface NoteViewData {
  notebook: {
    id: string
    name: string
    color: string
    folder_id: string
    folder_name: string
  }
  folder: {
    id: string
    name: string
    color: string
  } | null
  siblingNotebooks: Array<{
    id: string
    name: string
    color: string
  }>
  notes: Array<{
    id: string
    title: string
    preview: string
    created_at: string
    updated_at: string
  }>
  currentNote: {
    id: string
    title: string
    content: string
    created_at: string
    updated_at: string
  } | null
  pagination: {
    total: number
    offset: number
    limit: number
    hasMore: boolean
  }
}

interface ViewState {
  // Current view type
  currentView: 'folders' | 'notebook' | 'note' | null

  // View-specific data
  foldersView: FoldersViewData | null
  notebookView: NotebookViewData | null
  noteView: NoteViewData | null

  // Loading states
  loading: boolean
  error: string | null

  // Actions
  loadFoldersView: () => Promise<void>
  loadNotebookView: (folderId: string, offset?: number) => Promise<void>
  loadNoteView: (
    notebookId: string,
    options?: {
      noteId?: string
      offset?: number
      search?: string
      sort?: 'recent' | 'alphabetical' | 'created'
    }
  ) => Promise<void>

  // Updates
  updateFolder: (id: string, updates: Partial<FoldersViewData['folders'][0]>) => void
  updateNotebook: (id: string, updates: Partial<NotebookViewData['notebooks'][0]>) => void
  updateNote: (id: string, updates: Partial<NoteViewData['notes'][0]>) => void

  // Clear
  clearView: () => void
}

export const useViewStore = create<ViewState>()(
  immer((set) => ({
    currentView: null,
    foldersView: null,
    notebookView: null,
    noteView: null,
    loading: false,
    error: null,

    loadFoldersView: async () => {
      set((state) => {
        state.loading = true
        state.error = null
        state.currentView = 'folders'
      })

      try {
        const response = await fetch('/api/views/folders', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        if (!response.ok) throw new Error('Failed to load folders view')

        const data: FoldersViewData = await response.json()

        set((state) => {
          state.foldersView = data
          state.loading = false
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Unknown error'
          state.loading = false
        })
      }
    },

    loadNotebookView: async (folderId: string, offset = 0) => {
      set((state) => {
        state.loading = true
        state.error = null
        state.currentView = 'notebook'
      })

      try {
        const response = await fetch(
          `/api/views/folders/${folderId}/notebooks?offset=${offset}&limit=20`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
        if (!response.ok) throw new Error('Failed to load notebook view')

        const data: NotebookViewData = await response.json()

        set((state) => {
          if (offset === 0) {
            state.notebookView = data
          } else if (state.notebookView) {
            // Append for pagination
            state.notebookView.notebooks.push(...data.notebooks)
            state.notebookView.pagination = data.pagination
          }
          state.loading = false
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Unknown error'
          state.loading = false
        })
      }
    },

    loadNoteView: async (
      notebookId: string,
      options?: {
        noteId?: string
        offset?: number
        search?: string
        sort?: 'recent' | 'alphabetical' | 'created'
      }
    ) => {
      const { noteId, offset = 0, search = '', sort = 'recent' } = options || {}

      // Cancel any in-flight request
      if (currentNoteViewRequest) {
        currentNoteViewRequest.abort()
      }

      // Create new abort controller for this request
      currentNoteViewRequest = new AbortController()

      set((state) => {
        state.loading = true
        state.error = null
        state.currentView = 'note'
      })

      try {
        let url: string
        if (noteId) {
          url = `/api/views/notebooks/${notebookId}/notes/${noteId}`
        } else {
          const params = new URLSearchParams({
            offset: offset.toString(),
            limit: '20',
            ...(search && { search }),
            ...(sort && { sort }),
          })
          url = `/api/views/notebooks/${notebookId}/notes?${params}`
        }

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: currentNoteViewRequest.signal,
        })
        if (!response.ok) throw new Error('Failed to load note view')

        const data: NoteViewData = await response.json()

        set((state) => {
          if (offset === 0 || noteId) {
            state.noteView = data
          } else if (state.noteView) {
            // Append for pagination
            state.noteView.notes.push(...data.notes)
            state.noteView.pagination = data.pagination
          }
          state.loading = false
        })

        // Clear the request controller
        currentNoteViewRequest = null
      } catch (error) {
        // Ignore abort errors
        if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
          return
        }

        set((state) => {
          state.error = error instanceof Error ? error.message : 'Unknown error'
          state.loading = false
        })

        // Clear the request controller
        currentNoteViewRequest = null
      }
    },

    updateFolder: (id, updates) => {
      set((state) => {
        if (state.foldersView) {
          const folder = state.foldersView.folders.find((f) => f.id === id)
          if (folder) {
            Object.assign(folder, updates)
          }
        }
      })
    },

    updateNotebook: (id, updates) => {
      set((state) => {
        if (state.notebookView) {
          const notebook = state.notebookView.notebooks.find((n) => n.id === id)
          if (notebook) {
            Object.assign(notebook, updates)
          }
        }
      })
    },

    updateNote: (id, updates) => {
      set((state) => {
        if (state.noteView) {
          const note = state.noteView.notes.find((n) => n.id === id)
          if (note) {
            Object.assign(note, updates)
          }
          if (state.noteView.currentNote?.id === id) {
            Object.assign(state.noteView.currentNote, updates)
          }
        }
      })
    },

    clearView: () => {
      set((state) => {
        state.currentView = null
        state.foldersView = null
        state.notebookView = null
        state.noteView = null
        state.loading = false
        state.error = null
      })
    },
  }))
)

// Stable selectors that don't create new references
export const useFoldersView = () => useViewStore((state) => state.foldersView)
export const useNotebookView = () => useViewStore((state) => state.notebookView)
export const useNoteView = () => useViewStore((state) => state.noteView)
export const useViewLoading = () => useViewStore((state) => state.loading)
export const useViewError = () => useViewStore((state) => state.error)

// Actions
export const useViewActions = () => {
  const loadFoldersView = useViewStore((state) => state.loadFoldersView)
  const loadNotebookView = useViewStore((state) => state.loadNotebookView)
  const loadNoteView = useViewStore((state) => state.loadNoteView)
  const clearView = useViewStore((state) => state.clearView)

  return {
    loadFoldersView,
    loadNotebookView,
    loadNoteView,
    clearView,
  }
}
