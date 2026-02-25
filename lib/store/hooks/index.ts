// UI store hooks
export {
  useSelectedFolderId, // () => string | null
  useSelectedNotebookId, // () => string | null
  useNotebookSort, // () => NotebookSort
  useGlobalSearch, // () => string
  useSidebarCollapsed, // () => boolean
  useUIActions, // () => full store instance
  useUIState, // () => { selectedFolderId, ... }
} from './useUIStore'
