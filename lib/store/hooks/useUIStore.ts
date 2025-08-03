import { useStore } from 'zustand'
import { uiStore } from '../ui-store'

// UI state selectors
export const useSelectedFolderId = () => useStore(uiStore, (state) => state.selectedFolderId)
export const useSelectedNotebookId = () => useStore(uiStore, (state) => state.selectedNotebookId)
export const useNotebookSort = () => useStore(uiStore, (state) => state.notebookSort)
export const useGlobalSearch = () => useStore(uiStore, (state) => state.globalSearch)
export const useSidebarCollapsed = () => useStore(uiStore, (state) => state.sidebarCollapsed)

// UI actions
export const useUIActions = () => {
  return useStore(uiStore, (state) => ({
    setSelectedFolder: state.setSelectedFolder,
    setSelectedNotebook: state.setSelectedNotebook,
    setNotebookSort: state.setNotebookSort,
    setGlobalSearch: state.setGlobalSearch,
    setSidebarCollapsed: state.setSidebarCollapsed,
    loadPreferences: state.loadPreferences,
    savePreferences: state.savePreferences,
  }))
}

// Combined hook for common UI operations
export const useUIState = () => {
  return useStore(uiStore, (state) => ({
    selectedFolderId: state.selectedFolderId,
    selectedNotebookId: state.selectedNotebookId,
    notebookSort: state.notebookSort,
    globalSearch: state.globalSearch,
    sidebarCollapsed: state.sidebarCollapsed,
  }))
}