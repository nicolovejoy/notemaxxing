import { useStore } from 'zustand'
import { useMemo } from 'react'
import { dataStore } from '../data-store'
import { dataManager } from '../data-manager'
import type { Notebook, Note } from '../types'

// Selectors for common queries
export const useFolder = (id: string | null) => {
  return useStore(dataStore, (state) => id ? state.getFolder(id) : undefined)
}

export const useNotebook = (id: string | null) => {
  return useStore(dataStore, (state) => id ? state.getNotebook(id) : undefined)
}

export const useNote = (id: string | null) => {
  return useStore(dataStore, (state) => id ? state.getNote(id) : undefined)
}

export const useFolders = () => {
  const foldersMap = useStore(dataStore, (state) => state.entities.folders)
  return useMemo(() => Array.from(foldersMap.values()), [foldersMap])
}

export const useNotebooks = (includeArchived = false) => {
  const notebooksMap = useStore(dataStore, (state) => state.entities.notebooks)
  return useMemo(() => {
    const notebooks = Array.from(notebooksMap.values())
    return includeArchived ? notebooks : notebooks.filter(n => !n.archived)
  }, [notebooksMap, includeArchived])
}

export const useNotebooksInFolder = (folderId: string | null) => {
  const notebooksMap = useStore(dataStore, (state) => state.entities.notebooks)
  const notebookIds = useStore(dataStore, (state) => 
    folderId ? state.indexes.notebooksByFolder.get(folderId) : undefined
  )
  
  return useMemo(() => {
    if (!folderId || !notebookIds) return []
    return Array.from(notebookIds)
      .map(id => notebooksMap.get(id))
      .filter((n): n is Notebook => n !== undefined)
  }, [notebooksMap, notebookIds, folderId])
}

export const useNotesInNotebook = (notebookId: string | null) => {
  const notesMap = useStore(dataStore, (state) => state.entities.notes)
  const noteIds = useStore(dataStore, (state) => 
    notebookId ? state.indexes.notesByNotebook.get(notebookId) : undefined
  )
  
  return useMemo(() => {
    if (!notebookId || !noteIds) return []
    return Array.from(noteIds)
      .map(id => notesMap.get(id))
      .filter((n): n is Note => n !== undefined)
  }, [notesMap, noteIds, notebookId])
}

export const useNotes = () => {
  const notesMap = useStore(dataStore, (state) => state.entities.notes)
  return useMemo(() => {
    if (!notesMap) return []
    return Array.from(notesMap.values())
  }, [notesMap])
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
  archiveNotebook: (id: string) => dataManager.updateNotebook(id, { archived: true, archived_at: new Date().toISOString() }),
  restoreNotebook: (id: string) => dataManager.updateNotebook(id, { archived: false, archived_at: null }),
  
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
  const notebooks = useNotebooks()
  const folders = useFolders()
  
  return useMemo(() => {
    const accessibleFolderIds = new Set(folders.map(f => f.id))
    // Only return notebooks that are DIRECTLY shared and whose folder is NOT accessible
    return notebooks.filter(n => n.sharedDirectly && !accessibleFolderIds.has(n.folder_id))
  }, [notebooks, folders])
}