import { useStore } from 'zustand'
import { dataStore } from '../data-store'
import { dataManager } from '../data-manager'

// Stable empty array reference to avoid re-renders
type EntityArray = Array<{ id: string; [key: string]: unknown }>
const EMPTY_ARRAY: EntityArray = []

// Selectors for common queries
export const useFolder = (id: string | null) => {
  return useStore(dataStore, (state) => (id ? state.getFolder(id) : undefined))
}

export const useNotebook = (id: string | null) => {
  return useStore(dataStore, (state) => (id ? state.getNotebook(id) : undefined))
}

export const useNote = (id: string | null) => {
  return useStore(dataStore, (state) => (id ? state.getNote(id) : undefined))
}

// Now these hooks can directly return arrays - no conversion needed!
export const useFolders = () => {
  return useStore(dataStore, (state) => state.entities.folders)
}

export const useNotebooks = (includeArchived = false) => {
  return useStore(dataStore, (state) => {
    const notebooks = state.entities.notebooks
    return includeArchived ? notebooks : notebooks.filter((n) => !n.archived)
  })
}

export const useNotebooksInFolder = (folderId: string | null) => {
  return useStore(dataStore, (state) => {
    if (!folderId) return EMPTY_ARRAY
    return state.entities.notebooks.filter((n) => n.folder_id === folderId)
  })
}

export const useNotesInNotebook = (notebookId: string | null) => {
  return useStore(dataStore, (state) => {
    if (!notebookId) return EMPTY_ARRAY
    return state.entities.notes.filter((n) => n.notebook_id === notebookId)
  })
}

export const useNotes = () => {
  return useStore(dataStore, (state) => state.entities.notes)
}

// Actions wrapped with data manager - memoized to prevent recreation
const dataActions = {
  // Folder actions
  createFolder: dataManager.createFolder.bind(dataManager),
  updateFolder: dataManager.updateFolder.bind(dataManager),
  deleteFolder: dataManager.deleteFolder.bind(dataManager),

  // Notebook actions
  createNotebook: dataManager.createNotebook.bind(dataManager),
  updateNotebook: dataManager.updateNotebook.bind(dataManager),
  deleteNotebook: dataManager.deleteNotebook.bind(dataManager),
  archiveNotebook: (id: string) =>
    dataManager.updateNotebook(id, { archived: true, archived_at: new Date().toISOString() }),
  restoreNotebook: (id: string) =>
    dataManager.updateNotebook(id, { archived: false, archived_at: null }),

  // Note actions
  createNote: dataManager.createNote.bind(dataManager),
  updateNote: dataManager.updateNote.bind(dataManager),
  deleteNote: dataManager.deleteNote.bind(dataManager),
  loadNotesForNotebook: dataManager.loadNotesForNotebook.bind(dataManager),

  // Utility actions
  seedInitialData: dataManager.seedInitialData.bind(dataManager),
}

export const useDataActions = () => {
  return dataActions
}

// Sync state from store
export const useSyncState = () => {
  return useStore(dataStore, (state) => state.syncState)
}

export const useIsInitialized = () => {
  // This returns a primitive boolean, so it's stable
  return dataManager.isInitialized()
}

// Get directly shared notebooks (not through folder permissions)
export const useOrphanedSharedNotebooks = () => {
  return useStore(dataStore, (state) => {
    const notebooks = state.entities.notebooks
    const folders = state.entities.folders
    const accessibleFolderIds = new Set(folders.map((f) => f.id))
    // Only return notebooks that are DIRECTLY shared and whose folder is NOT accessible
    return notebooks.filter(
      (n) =>
        (n as unknown as Record<string, unknown>).sharedDirectly &&
        !accessibleFolderIds.has(n.folder_id)
    )
  })
}
