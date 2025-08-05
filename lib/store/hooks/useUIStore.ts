import { useStore } from 'zustand'
import { uiStore } from '../ui-store'

// UI state selectors
export const useSelectedFolderId = () => useStore(uiStore, (state) => state.selectedFolderId)
export const useSelectedNotebookId = () => useStore(uiStore, (state) => state.selectedNotebookId)
export const useNotebookSort = () => useStore(uiStore, (state) => state.notebookSort)
export const useGlobalSearch = () => useStore(uiStore, (state) => state.globalSearch)
export const useSidebarCollapsed = () => useStore(uiStore, (state) => state.sidebarCollapsed)

// UI actions - return the store instance directly since actions are stable
export const useUIActions = () => {
  return uiStore.getState()
}

// Stable selector for UI state
const selectUIState = (state: ReturnType<typeof uiStore.getState>) => ({
  selectedFolderId: state.selectedFolderId,
  selectedNotebookId: state.selectedNotebookId,
  notebookSort: state.notebookSort,
  globalSearch: state.globalSearch,
  sidebarCollapsed: state.sidebarCollapsed,
})

// Combined hook for common UI operations
export const useUIState = () => {
  return useStore(uiStore, selectUIState)
}