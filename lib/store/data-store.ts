import { createStore } from 'zustand/vanilla'
import type { Folder, Notebook, Note, Quiz, ShareInvitation, Permission } from './types'

export interface DataState {
  // Entity Arrays - simpler and works better with React
  entities: {
    folders: Folder[]
    notebooks: Notebook[]
    notes: Note[]
    quizzes: Quiz[]
  }

  // Metadata (keeping as Maps since they're not rendered directly)
  metadata: {
    permissions: Map<string, Permission[]>
    shareInvitations: Map<string, ShareInvitation>
  }

  // Sync state
  syncState: {
    status: 'idle' | 'loading' | 'error'
    error: string | null
    lastSyncTime: Date | null
    realtimeStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error'
  }

  // Actions
  setFolders: (folders: Folder[]) => void
  setNotebooks: (notebooks: Notebook[]) => void
  setNotes: (notes: Note[]) => void
  setQuizzes: (quizzes: Quiz[]) => void
  setPermissions: (permissions: Map<string, Permission[]>) => void
  setShareInvitations: (invitations: Map<string, ShareInvitation>) => void

  // Entity operations
  addFolder: (folder: Folder) => void
  updateFolder: (id: string, updates: Partial<Folder>) => void
  removeFolder: (id: string) => void

  addNotebook: (notebook: Notebook) => void
  updateNotebook: (id: string, updates: Partial<Notebook>) => void
  removeNotebook: (id: string) => void

  addNote: (note: Note) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  removeNote: (id: string) => void

  // Getters
  getFolder: (id: string) => Folder | undefined
  getNotebook: (id: string) => Notebook | undefined
  getNote: (id: string) => Note | undefined
  getNotebooksInFolder: (folderId: string) => Notebook[]
  getNotesInNotebook: (notebookId: string) => Note[]

  // Sync state actions
  setSyncStatus: (status: 'idle' | 'loading' | 'error') => void
  setSyncError: (error: string | null) => void
  setSyncTime: (time: Date | null) => void
  setRealtimeStatus: (status: 'connected' | 'disconnected' | 'reconnecting' | 'error') => void

  // Clear functions
  clearAll: () => void
}

export const dataStore = createStore<DataState>((set, get) => ({
  entities: {
    folders: [],
    notebooks: [],
    notes: [],
    quizzes: [],
  },

  metadata: {
    permissions: new Map(),
    shareInvitations: new Map(),
  },

  syncState: {
    status: 'idle',
    error: null,
    lastSyncTime: null,
    realtimeStatus: 'disconnected',
  },

  // Bulk setters
  setFolders: (folders) =>
    set((state) => ({
      entities: {
        ...state.entities,
        folders,
      },
    })),

  setNotebooks: (notebooks) =>
    set((state) => ({
      entities: {
        ...state.entities,
        notebooks,
      },
    })),

  setNotes: (notes) =>
    set((state) => ({
      entities: {
        ...state.entities,
        notes,
      },
    })),

  setQuizzes: (quizzes) =>
    set((state) => ({
      entities: {
        ...state.entities,
        quizzes,
      },
    })),

  setPermissions: (permissions) =>
    set((state) => ({
      metadata: {
        ...state.metadata,
        permissions,
      },
    })),

  setShareInvitations: (invitations) =>
    set((state) => ({
      metadata: {
        ...state.metadata,
        shareInvitations: invitations,
      },
    })),

  // Individual operations
  addFolder: (folder) =>
    set((state) => ({
      entities: {
        ...state.entities,
        folders: [...state.entities.folders, folder],
      },
    })),

  updateFolder: (id, updates) =>
    set((state) => ({
      entities: {
        ...state.entities,
        folders: state.entities.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      },
    })),

  removeFolder: (id) =>
    set((state) => ({
      entities: {
        ...state.entities,
        folders: state.entities.folders.filter((f) => f.id !== id),
        // Also remove orphaned notebooks and notes
        notebooks: state.entities.notebooks.filter((n) => n.folder_id !== id),
        notes: state.entities.notes.filter((n) => {
          // Remove notes that belong to notebooks in this folder
          const notebook = state.entities.notebooks.find((nb) => nb.id === n.notebook_id)
          return notebook?.folder_id !== id
        }),
      },
    })),

  addNotebook: (notebook) =>
    set((state) => ({
      entities: {
        ...state.entities,
        notebooks: [...state.entities.notebooks, notebook],
      },
    })),

  updateNotebook: (id, updates) =>
    set((state) => ({
      entities: {
        ...state.entities,
        notebooks: state.entities.notebooks.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      },
    })),

  removeNotebook: (id) =>
    set((state) => ({
      entities: {
        ...state.entities,
        notebooks: state.entities.notebooks.filter((n) => n.id !== id),
        // Also remove orphaned notes
        notes: state.entities.notes.filter((n) => n.notebook_id !== id),
      },
    })),

  addNote: (note) =>
    set((state) => ({
      entities: {
        ...state.entities,
        notes: [...state.entities.notes, note],
      },
    })),

  updateNote: (id, updates) =>
    set((state) => ({
      entities: {
        ...state.entities,
        notes: state.entities.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      },
    })),

  removeNote: (id) =>
    set((state) => ({
      entities: {
        ...state.entities,
        notes: state.entities.notes.filter((n) => n.id !== id),
      },
    })),

  // Getters
  getFolder: (id) => get().entities.folders.find((f) => f.id === id),
  getNotebook: (id) => get().entities.notebooks.find((n) => n.id === id),
  getNote: (id) => get().entities.notes.find((n) => n.id === id),

  getNotebooksInFolder: (folderId) => {
    const state = get()
    return state.entities.notebooks.filter((n) => n.folder_id === folderId)
  },

  getNotesInNotebook: (notebookId) => {
    const state = get()
    return state.entities.notes.filter((n) => n.notebook_id === notebookId)
  },

  // Sync state actions
  setSyncStatus: (status) =>
    set((state) => ({
      syncState: { ...state.syncState, status },
    })),

  setSyncError: (error) =>
    set((state) => ({
      syncState: { ...state.syncState, error },
    })),

  setSyncTime: (time) =>
    set((state) => ({
      syncState: { ...state.syncState, lastSyncTime: time },
    })),

  setRealtimeStatus: (status) =>
    set((state) => ({
      syncState: { ...state.syncState, realtimeStatus: status },
    })),

  clearAll: () =>
    set(() => ({
      entities: {
        folders: [],
        notebooks: [],
        notes: [],
        quizzes: [],
      },
      metadata: {
        permissions: new Map(),
        shareInvitations: new Map(),
      },
    })),
}))
