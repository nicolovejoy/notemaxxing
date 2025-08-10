import { createStore } from 'zustand/vanilla'

export type NotebookSort =
  | 'recent'
  | 'alphabetical'
  | 'created'
  | 'alphabetical-reverse'
  | 'created-reverse'

export interface UIState {
  // Selection state
  selectedFolderId: string | null
  selectedNotebookId: string | null

  // View preferences
  notebookSort: NotebookSort
  globalSearch: string

  // UI state
  sidebarCollapsed: boolean

  // Actions
  setSelectedFolder: (id: string | null) => void
  setSelectedNotebook: (id: string | null) => void
  setNotebookSort: (sort: NotebookSort) => void
  setGlobalSearch: (search: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Preferences
  loadPreferences: () => void
  savePreferences: () => void
}

export const uiStore = createStore<UIState>((set, get) => ({
  // Initial state
  selectedFolderId: null,
  selectedNotebookId: null,
  notebookSort: 'recent',
  globalSearch: '',
  sidebarCollapsed: false,

  // Actions
  setSelectedFolder: (id) => set({ selectedFolderId: id }),
  setSelectedNotebook: (id) => set({ selectedNotebookId: id }),

  setNotebookSort: (sort) => {
    set({ notebookSort: sort })
    get().savePreferences()
  },

  setGlobalSearch: (search) => set({ globalSearch: search }),
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed })
    get().savePreferences()
  },

  // Preferences
  loadPreferences: () => {
    try {
      const stored = localStorage.getItem('notemaxxing-ui-preferences')
      if (stored) {
        const preferences = JSON.parse(stored)
        set({
          notebookSort: preferences.notebookSort || 'recent',
          sidebarCollapsed: preferences.sidebarCollapsed || false,
        })
      }
    } catch (error) {
      console.error('[UIStore] Failed to load preferences:', error)
    }
  },

  savePreferences: () => {
    try {
      const state = get()
      const preferences = {
        notebookSort: state.notebookSort,
        sidebarCollapsed: state.sidebarCollapsed,
      }
      localStorage.setItem('notemaxxing-ui-preferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('[UIStore] Failed to save preferences:', error)
    }
  },
}))
