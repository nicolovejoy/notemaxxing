// Data store hooks - Clean API that returns raw data
export {
  useFolder,        // (id) => Folder | undefined
  useNotebook,      // (id) => Notebook | undefined  
  useNote,          // (id) => Note | undefined
  useFolders,       // () => Folder[]
  useNotebooks,     // (includeArchived?) => Notebook[]
  useNotebooksInFolder,  // (folderId) => Notebook[]
  useNotesInNotebook,    // (notebookId) => Note[]
  useNotes,         // () => Note[] (all notes)
  useDataActions,   // () => { createFolder, updateFolder, ... }
  useSyncState,     // () => { status, error, lastSyncTime }
  useIsInitialized, // () => boolean
  useOrphanedSharedNotebooks, // () => Notebook[] (shared notebooks without folder access)
} from './useDataStore'

// UI store hooks
export {
  useSelectedFolderId,   // () => string | null
  useSelectedNotebookId, // () => string | null
  useNotebookSort,       // () => NotebookSort
  useGlobalSearch,       // () => string
  useSidebarCollapsed,   // () => boolean
  useUIActions,          // () => full store instance
  useUIState,           // () => { selectedFolderId, ... }
} from './useUIStore'