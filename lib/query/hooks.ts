import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/supabase/database.types'

// Types from database
type Folder = Database['public']['Tables']['folders']['Row']
type Notebook = Database['public']['Tables']['notebooks']['Row']
type Note = Database['public']['Tables']['notes']['Row']

// Extended types with computed fields
interface FolderWithStats extends Folder {
  notebook_count: number
  note_count: number
  archived_count: number
  notebooks?: NotebookWithStats[]
  most_recent_notebook_id?: string | null
  permission?: 'owner' | 'write' | 'read'
  owner_id?: string
  owner_email?: string
  shared_by?: string
  shared_at?: string
}

interface NotebookWithStats extends Notebook {
  note_count?: number
  permission?: 'owner' | 'write' | 'read'
  shared_by?: string
}

interface FolderView {
  folders: FolderWithStats[]
  orphanedNotebooks: NotebookWithStats[]
  stats: {
    total_folders: number
    total_notebooks: number
    total_notes: number
    total_archived: number
  }
}

interface NotebookView {
  notebook: NotebookWithStats
  notes: Note[]
  totalCount: number
  folderInfo: Folder
  siblingNotebooks: NotebookWithStats[]
}

// API Functions (these call your existing endpoints)
const api = {
  // Folders
  async getFoldersView(): Promise<FolderView> {
    const res = await fetch('/api/views/folders')
    if (!res.ok) {
      if (res.status === 401) {
        // Return empty data for unauthenticated users
        return {
          folders: [],
          orphanedNotebooks: [],
          stats: {
            total_folders: 0,
            total_notebooks: 0,
            total_notes: 0,
            total_archived: 0,
          },
        }
      }
      throw new Error(`Failed to fetch folders: ${res.status}`)
    }
    return res.json()
  },

  async createFolder(folder: Partial<Folder>) {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folder),
    })
    if (!res.ok) throw new Error('Failed to create folder')
    return res.json()
  },

  async updateFolder(id: string, updates: Partial<Folder>) {
    const res = await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update folder')
    return res.json()
  },

  async deleteFolder(id: string) {
    const res = await fetch(`/api/folders/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete folder')
    return res.json()
  },

  // Notebooks
  async getNotebookView(
    notebookId: string,
    params?: {
      search?: string
      sort?: string
      limit?: number
      offset?: number
    }
  ): Promise<NotebookView> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }
    const res = await fetch(`/api/views/notebooks/${notebookId}/notes?${searchParams}`)
    if (!res.ok) throw new Error('Failed to fetch notebook')
    return res.json()
  },

  async createNotebook(notebook: Partial<Notebook>) {
    const res = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notebook),
    })
    if (!res.ok) throw new Error('Failed to create notebook')
    return res.json()
  },

  async updateNotebook(id: string, updates: Partial<Notebook>) {
    const res = await fetch(`/api/notebooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update notebook')
    return res.json()
  },

  // Notes
  async createNote(note: Partial<Note>) {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    })
    if (!res.ok) throw new Error('Failed to create note')
    return res.json()
  },

  async updateNote(id: string, updates: Partial<Note>) {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update note')
    return res.json()
  },

  async deleteNote(id: string) {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete note')
    return res.json()
  },
}

// ============================================
// QUERY HOOKS (for fetching data)
// ============================================

/**
 * Fetch folders view - NO INFINITE LOOPS POSSIBLE!
 * React Query handles all caching and deduplication
 */
export function useFoldersView() {
  return useQuery({
    queryKey: ['folders-view'],
    queryFn: api.getFoldersView,
    // This data changes infrequently, cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Don't retry on 401 (unauthenticated)
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false
      }
      return failureCount < 3
    },
  })
}

/**
 * Fetch notebook view with notes
 */
export function useNotebookView(
  notebookId: string | undefined,
  params?: {
    search?: string
    sort?: string
    limit?: number
    offset?: number
  }
) {
  return useQuery({
    // Include params in key so different searches are cached separately
    queryKey: ['notebook-view', notebookId, params],
    queryFn: () => api.getNotebookView(notebookId!, params),
    enabled: !!notebookId, // Only fetch if we have an ID
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// ============================================
// MUTATION HOOKS (for creating/updating/deleting)
// ============================================

/**
 * Create a new folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: api.createFolder,
    onSuccess: (newFolder) => {
      // Invalidate and refetch folders
      queryClient.invalidateQueries({ queryKey: ['folders-view'] })

      // Navigate to the new folder
      if (newFolder.id) {
        router.push(`/folders/${newFolder.id}`)
      }
    },
  })
}

/**
 * Update a folder
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Folder> }) =>
      api.updateFolder(id, updates),
    onSuccess: () => {
      // Invalidate folders view to refetch
      queryClient.invalidateQueries({ queryKey: ['folders-view'] })
    },
  })
}

/**
 * Delete a folder
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: api.deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders-view'] })
      router.push('/folders')
    },
  })
}

/**
 * Create a new notebook
 */
export function useCreateNotebook() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: api.createNotebook,
    onSuccess: (newNotebook) => {
      // Invalidate folders to update counts
      queryClient.invalidateQueries({ queryKey: ['folders-view'] })

      // Navigate to the new notebook
      if (newNotebook.id) {
        router.push(`/notebooks/${newNotebook.id}`)
      }
    },
  })
}

/**
 * Create a new note
 */
export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createNote,
    onSuccess: (newNote) => {
      // Invalidate the notebook view to show the new note
      queryClient.invalidateQueries({
        queryKey: ['notebook-view', newNote.notebook_id],
      })
    },
  })
}

/**
 * Update a note
 */
export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Note> }) =>
      api.updateNote(id, updates),
    onSuccess: (updatedNote) => {
      // Invalidate the notebook view
      queryClient.invalidateQueries({
        queryKey: ['notebook-view', updatedNote.notebook_id],
      })
    },
  })
}

/**
 * Delete a note
 */
export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deleteNote,
    onSuccess: () => {
      // Invalidate all notebook views since we don't know which one
      queryClient.invalidateQueries({
        queryKey: ['notebook-view'],
      })
    },
  })
}

// ============================================
// PREFETCHING (for optimizations)
// ============================================

/**
 * Prefetch folders in the background
 * Use this on the home page for faster navigation
 */
export function usePrefetchFolders() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.prefetchQuery({
      queryKey: ['folders-view'],
      queryFn: api.getFoldersView,
      staleTime: 5 * 60 * 1000,
    })
  }
}

/**
 * Prefetch a notebook before navigation
 */
export function usePrefetchNotebook() {
  const queryClient = useQueryClient()

  return (notebookId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['notebook-view', notebookId, undefined],
      queryFn: () => api.getNotebookView(notebookId),
      staleTime: 1 * 60 * 1000,
    })
  }
}
