import { useStore } from './useStore'
import { useMemo } from 'react'

// Folder hooks
export const useFolders = () => {
  const folders = useStore((state) => state.folders)
  const loading = useStore((state) => state.syncState.status === 'loading')
  const error = useStore((state) => state.syncState.error)
  return { folders, loading, error }
}

export const useFolder = (id: string | null) => {
  const folder = useStore((state) => 
    id ? state.folders.find(f => f.id === id) : null
  )
  return folder
}

export const useFolderActions = () => {
  const createFolder = useStore((state) => state.createFolder)
  const updateFolder = useStore((state) => state.updateFolder)
  const deleteFolder = useStore((state) => state.deleteFolder)
  return { createFolder, updateFolder, deleteFolder }
}

// Notebook hooks
export const useNotebooks = (folderId?: string | null, includeArchived = false) => {
  const allNotebooks = useStore((state) => state.notebooks)
  const loading = useStore((state) => state.syncState.status === 'loading')
  const error = useStore((state) => state.syncState.error)
  
  const notebooks = useMemo(() => {
    let filtered = includeArchived 
      ? allNotebooks 
      : allNotebooks.filter(n => !n.archived)
    
    if (folderId) {
      filtered = filtered.filter(n => n.folder_id === folderId)
    }
    
    return filtered
  }, [allNotebooks, folderId, includeArchived])
  
  return { notebooks, loading, error }
}

export const useNotebook = (id: string | null) => {
  const notebook = useStore((state) => 
    id ? state.notebooks.find(n => n.id === id) : null
  )
  return notebook
}

export const useNotebookActions = () => {
  const createNotebook = useStore((state) => state.createNotebook)
  const updateNotebook = useStore((state) => state.updateNotebook)
  const archiveNotebook = useStore((state) => state.archiveNotebook)
  const restoreNotebook = useStore((state) => state.restoreNotebook)
  const deleteNotebook = useStore((state) => state.deleteNotebook)
  return { createNotebook, updateNotebook, archiveNotebook, restoreNotebook, deleteNotebook }
}

// Note hooks
export const useNotes = (notebookId?: string | null) => {
  const allNotes = useStore((state) => state.notes)
  const loading = useStore((state) => state.syncState.status === 'loading')
  const error = useStore((state) => state.syncState.error)
  
  const notes = useMemo(() => {
    if (!notebookId) return allNotes
    return allNotes.filter(n => n.notebook_id === notebookId)
  }, [allNotes, notebookId])
  
  return { notes, loading, error }
}

export const useNote = (id: string | null) => {
  const note = useStore((state) => 
    id ? state.notes.find(n => n.id === id) : null
  )
  return note
}

export const useNoteActions = () => {
  const createNote = useStore((state) => state.createNote)
  const updateNote = useStore((state) => state.updateNote)
  const deleteNote = useStore((state) => state.deleteNote)
  return { createNote, updateNote, deleteNote }
}

// Quiz hooks
export const useQuizzes = () => {
  const quizzes = useStore((state) => state.quizzes)
  const loading = useStore((state) => state.syncState.status === 'loading')
  const error = useStore((state) => state.syncState.error)
  return { quizzes, loading, error }
}

export const useQuiz = (id: string | null) => {
  const quiz = useStore((state) => 
    id ? state.quizzes.find(q => q.id === id) : null
  )
  return quiz
}

export const useQuizActions = () => {
  const createQuiz = useStore((state) => state.createQuiz)
  const updateQuiz = useStore((state) => state.updateQuiz)
  const deleteQuiz = useStore((state) => state.deleteQuiz)
  return { createQuiz, updateQuiz, deleteQuiz }
}

// UI State hooks
export const useSelectedFolder = () => {
  const selectedFolderId = useStore((state) => state.selectedFolderId)
  const setSelectedFolder = useStore((state) => state.setSelectedFolder)
  const folder = useFolder(selectedFolderId)
  return { selectedFolderId, folder, setSelectedFolder }
}

export const useSelectedNotebook = () => {
  const selectedNotebookId = useStore((state) => state.selectedNotebookId)
  const setSelectedNotebook = useStore((state) => state.setSelectedNotebook)
  const notebook = useNotebook(selectedNotebookId)
  return { selectedNotebookId, notebook, setSelectedNotebook }
}

// Sync state hooks
export const useSyncState = () => {
  const syncState = useStore((state) => state.syncState)
  const setSyncError = useStore((state) => state.setSyncError)
  return { ...syncState, setSyncError }
}

// Initialize store hook
export const useInitializeStore = () => {
  const initializeStore = useStore((state) => state.initializeStore)
  return initializeStore
}

// Optimistic updates hook
export const useOptimisticUpdates = () => {
  const optimisticUpdates = useStore((state) => state.optimisticUpdates)
  const clearOptimisticUpdate = useStore((state) => state.clearOptimisticUpdate)
  return { optimisticUpdates, clearOptimisticUpdate }
}

// Combined data hook for dashboard-like views
export const useAppData = () => {
  const folders = useStore((state) => state.folders)
  const notebooks = useStore((state) => state.notebooks)
  const notes = useStore((state) => state.notes)
  const loading = useStore((state) => state.syncState.status === 'loading')
  const error = useStore((state) => state.syncState.error)
  
  const stats = useMemo(() => ({
    totalFolders: folders.length,
    totalNotebooks: notebooks.filter(n => !n.archived).length,
    archivedNotebooks: notebooks.filter(n => n.archived).length,
    totalNotes: notes.length,
  }), [folders, notebooks, notes])
  
  return { folders, notebooks, notes, stats, loading, error }
}