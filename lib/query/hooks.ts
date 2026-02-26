import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { Folder, Notebook, Note } from '@/lib/types/entities'
import { apiFetch } from '@/lib/firebase/api-fetch'

// Extended types with computed fields
interface FolderWithStats extends Omit<Folder, 'permission'> {
  notebook_count: number
  note_count: number
  archived_count: number
  notebooks?: NotebookWithStats[]
  most_recent_notebook_id?: string | null
  permission?: 'owner' | 'write' | 'read'
  owner_email?: string
  shared_by?: string
  shared_at?: string
  sharedByMe?: boolean
  sharedWithMe?: boolean
}

interface NotebookWithStats extends Omit<Notebook, 'permission'> {
  note_count?: number
  permission?: 'owner' | 'write' | 'read'
  shared_by?: string
  sharedByMe?: boolean
  sharedWithMe?: boolean
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

export interface NotebookView {
  notebook: {
    id: string
    name: string
    color: string
    folder_id: string
    folder_name: string
    owner_id: string
    sort_order?: 'recent' | 'alphabetical' | 'created' | 'manual'
    shared?: boolean
    permission?: 'owner' | 'read' | 'write'
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
    position?: number
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

// API Functions (these call your existing endpoints)
const api = {
  // Folders
  async getFoldersView(): Promise<FolderView> {
    const res = await apiFetch('/api/views/folders')
    if (!res.ok) {
      if (res.status === 401) {
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
    const res = await apiFetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folder),
    })
    if (!res.ok) throw new Error('Failed to create folder')
    return res.json()
  },

  async updateFolder(id: string, updates: Partial<Folder>) {
    const res = await apiFetch('/api/folders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    if (!res.ok) throw new Error('Failed to update folder')
    return res.json()
  },

  // Notebooks
  async getNotebookView(
    notebookId: string,
    params?: {
      search?: string
      sort?: string
      sortDir?: string
      limit?: number
      offset?: number
    },
    signal?: AbortSignal
  ): Promise<NotebookView> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }
    const res = await apiFetch(`/api/views/notebooks/${notebookId}/notes?${searchParams}`, {
      signal,
    })
    if (!res.ok) throw new Error('Failed to fetch notebook')
    return res.json()
  },

  async createNotebook(notebook: Partial<Notebook>) {
    const res = await apiFetch('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notebook),
    })
    if (!res.ok) throw new Error('Failed to create notebook')
    return res.json()
  },

  async updateNotebook(id: string, updates: Partial<Notebook>) {
    const res = await apiFetch('/api/notebooks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    if (!res.ok) throw new Error('Failed to update notebook')
    return res.json()
  },

  // Notes
  async createNote(note: Partial<Note>) {
    const res = await apiFetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    })
    if (!res.ok) throw new Error('Failed to create note')
    return res.json()
  },

  async updateNote(id: string, updates: Partial<Note>) {
    const res = await apiFetch('/api/notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    if (!res.ok) throw new Error('Failed to update note')
    return res.json()
  },

  async deleteNote(id: string) {
    const res = await apiFetch(`/api/notes?id=${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete note')
    return res.json()
  },
}

// ============================================
// QUERY HOOKS (for fetching data)
// ============================================

export function useFoldersView(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['folders-view'],
    queryFn: api.getFoldersView,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) {
        return false
      }
      return failureCount < 3
    },
    enabled: options?.enabled !== false,
  })
}

export function useNotebookView(
  notebookId: string | undefined,
  params?: {
    search?: string
    sort?: string
    sortDir?: string
    limit?: number
    offset?: number
  }
) {
  return useQuery({
    queryKey: ['notebook-view', notebookId, params],
    queryFn: ({ signal }) => api.getNotebookView(notebookId!, params, signal),
    enabled: !!notebookId,
    staleTime: 30 * 1000,
  })
}

// ============================================
// MUTATION HOOKS (for creating/updating/deleting)
// ============================================

export function useCreateFolder() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: api.createFolder,
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ['folders-view'] })
      if (newFolder.id) {
        router.push(`/folders/${newFolder.id}`)
      }
    },
  })
}

export function useUpdateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Folder> }) =>
      api.updateFolder(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders-view'] })
    },
  })
}

export function useCreateNotebook() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: api.createNotebook,
    onSuccess: (newNotebook) => {
      queryClient.invalidateQueries({ queryKey: ['folders-view'] })
      if (newNotebook.id) {
        router.push(`/notebooks/${newNotebook.id}`)
      }
    },
  })
}

export function useRenameNotebook(notebookId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => api.updateNotebook(notebookId, { name }),
    onMutate: async (newName) => {
      await queryClient.cancelQueries({ queryKey: ['notebook-view', notebookId] })
      queryClient.setQueriesData<NotebookView>(
        { queryKey: ['notebook-view', notebookId] },
        (old) => (old ? { ...old, notebook: { ...old.notebook, name: newName } } : old)
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders-view'] })
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['notebook-view', notebookId] })
    },
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createNote,
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({
        queryKey: ['notebook-view', newNote.notebook_id],
      })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Note> }) =>
      api.updateNote(id, updates),
    onSuccess: (updatedNote) => {
      queryClient.invalidateQueries({
        queryKey: ['notebook-view', updatedNote.notebook_id],
      })
    },
  })
}

export function useDeleteNote(notebookId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notebook-view', notebookId],
      })
    },
  })
}

export function useFolderDetailView(folderId: string | null) {
  return useQuery({
    queryKey: ['folder-detail', folderId],
    queryFn: async () => {
      if (!folderId) return null
      const response = await apiFetch(`/api/views/folders/${folderId}`)
      if (!response.ok) {
        if (response.status === 404) throw new Error('Folder not found')
        if (response.status === 403) throw new Error('Access denied')
        throw new Error('Failed to fetch folder')
      }
      return response.json()
    },
    enabled: !!folderId,
    staleTime: 30 * 1000,
  })
}
