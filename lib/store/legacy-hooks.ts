/**
 * Legacy hooks for backward compatibility with old store structure
 * These hooks map the old API to the new separated stores
 * Components should gradually migrate to use the new hooks directly
 */

import { useMemo } from 'react'
import {
  useFolders as useNewFolders,
  useFolder as useNewFolder,
  useNotebooks as useNewNotebooks,
  useNotebook as useNewNotebook,
  useNote as useNewNote,
  useNotesInNotebook,
  useDataActions,
  useSyncState as useNewSyncState,
  useSelectedFolderId,
  useSelectedNotebookId,
  useNotebookSort as useUINotebookSort,
  useGlobalSearch as useUIGlobalSearch,
  useUIActions,
} from './hooks/index'
import { dataManager } from './data-manager'

// Folder hooks
export const useFolders = () => {
  const folders = useNewFolders()
  const syncState = useNewSyncState()
  return {
    folders,
    loading: syncState.status === 'loading',
    error: syncState.error,
  }
}

export const useFolder = (id: string | null) => {
  return useNewFolder(id)
}

export const useFolderActions = () => {
  const actions = useDataActions()
  return {
    createFolder: actions.createFolder,
    updateFolder: actions.updateFolder,
    deleteFolder: actions.deleteFolder,
  }
}

// Notebook hooks
export const useNotebooks = (folderId?: string | null, includeArchived = false) => {
  const allNotebooks = useNewNotebooks(includeArchived)
  const syncState = useNewSyncState()
  
  const notebooks = useMemo(() => {
    if (!folderId) return allNotebooks
    return allNotebooks.filter(n => n.folder_id === folderId)
  }, [allNotebooks, folderId])
  
  return {
    notebooks,
    loading: syncState.status === 'loading',
    error: syncState.error,
  }
}

export const useNotebook = (id: string | null) => {
  return useNewNotebook(id)
}

export const useNotebookActions = () => {
  const actions = useDataActions()
  return {
    createNotebook: actions.createNotebook,
    updateNotebook: actions.updateNotebook,
    archiveNotebook: actions.archiveNotebook,
    restoreNotebook: actions.restoreNotebook,
    deleteNotebook: actions.deleteNotebook,
  }
}

// Note hooks
export const useNotes = (notebookId?: string | null) => {
  // Always call hooks in the same order
  const notesFromNotebook = useNotesInNotebook(notebookId || null)
  const syncState = useNewSyncState()
  
  const notes = useMemo(() => {
    if (!notebookId) return []
    return notesFromNotebook
  }, [notebookId, notesFromNotebook])
  
  return {
    notes,
    loading: syncState.status === 'loading',
    error: syncState.error,
  }
}

export const useNote = (id: string | null) => {
  return useNewNote(id)
}

export const useNoteActions = () => {
  const actions = useDataActions()
  return {
    createNote: actions.createNote,
    updateNote: actions.updateNote,
    deleteNote: actions.deleteNote,
  }
}

// Quiz hooks (placeholder - quizzes not implemented in new store yet)
export const useQuizzes = () => {
  const syncState = useNewSyncState()
  return {
    quizzes: [],
    loading: syncState.status === 'loading',
    error: syncState.error,
  }
}

export const useQuiz = (_id: string | null) => {
  return null
}

export const useQuizActions = () => {
  return {
    createQuiz: async () => { throw new Error('Not implemented') },
    updateQuiz: async () => { throw new Error('Not implemented') },
    deleteQuiz: async () => { throw new Error('Not implemented') },
  }
}

// UI State hooks
export const useSelectedFolder = () => {
  const selectedFolderId = useSelectedFolderId()
  const folder = useNewFolder(selectedFolderId)
  const { setSelectedFolder } = useUIActions()
  return { selectedFolderId, folder, setSelectedFolder }
}

export const useSelectedNotebook = () => {
  const selectedNotebookId = useSelectedNotebookId()
  const notebook = useNewNotebook(selectedNotebookId)
  const { setSelectedNotebook } = useUIActions()
  return { selectedNotebookId, notebook, setSelectedNotebook }
}

// Sync state hooks
export const useSyncState = () => {
  const syncState = useNewSyncState()
  return {
    ...syncState,
    setSyncError: (_error: string | null) => {
      console.warn('setSyncError is deprecated in new store')
    },
  }
}

// Initialize store hook
export const useInitializeStore = () => {
  return async () => {
    await dataManager.initialize()
  }
}

// Optimistic updates hook (no longer used in new architecture)
export const useOptimisticUpdates = () => {
  return {
    optimisticUpdates: [],
    clearOptimisticUpdate: () => {},
  }
}

// Combined data hook for dashboard-like views
export const useAppData = () => {
  const folders = useNewFolders()
  const notebooks = useNewNotebooks(true)
  const syncState = useNewSyncState()
  
  const stats = useMemo(() => ({
    totalFolders: folders.length,
    totalNotebooks: notebooks.filter(n => !n.archived).length,
    archivedNotebooks: notebooks.filter(n => n.archived).length,
    totalNotes: 0, // Would need to load all notes
  }), [folders, notebooks])
  
  return {
    folders,
    notebooks,
    notes: [],
    stats,
    loading: syncState.status === 'loading',
    error: syncState.error,
  }
}

// Sort & Search hooks
export const useNotebookSort = () => {
  const notebookSort = useUINotebookSort()
  const { setNotebookSort } = useUIActions()
  return { notebookSort, setNotebookSort }
}

export const useGlobalSearch = () => {
  const globalSearch = useUIGlobalSearch()
  const { setGlobalSearch } = useUIActions()
  return { globalSearch, setGlobalSearch }
}

// Seed data hook
export const useSeedData = () => {
  const { seedInitialData } = useDataActions()
  const syncState = useNewSyncState()
  return {
    seedInitialData,
    loading: syncState.status === 'loading',
  }
}

// Helper hook to get most recently edited notebook in a folder
export const useMostRecentNotebook = (folderId: string | null) => {
  const notebooks = useNewNotebooks()
  
  return useMemo(() => {
    if (!folderId) return null
    
    const folderNotebooks = notebooks.filter(n => n.folder_id === folderId && !n.archived)
    if (folderNotebooks.length === 0) return null
    
    // Sort by updated_at descending
    const sorted = [...folderNotebooks].sort((a, b) => {
      const timeA = new Date(a.updated_at).getTime()
      const timeB = new Date(b.updated_at).getTime()
      return timeB - timeA
    })
    
    return sorted[0]
  }, [folderId, notebooks])
}