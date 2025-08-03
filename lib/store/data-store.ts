import { createStore } from 'zustand/vanilla'
import type { Folder, Notebook, Note, Quiz, ShareInvitation, Permission } from './types'

export interface DataState {
  // Entity Maps for O(1) lookup
  entities: {
    folders: Map<string, Folder>
    notebooks: Map<string, Notebook>
    notes: Map<string, Note>
    quizzes: Map<string, Quiz>
  }
  
  // Metadata
  metadata: {
    permissions: Map<string, Permission[]>
    shareInvitations: Map<string, ShareInvitation>
  }
  
  // Indexes for efficient queries
  indexes: {
    notebooksByFolder: Map<string, Set<string>>
    notesByNotebook: Map<string, Set<string>>
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
  
  // Clear functions
  clearAll: () => void
}

export const dataStore = createStore<DataState>((set, get) => ({
  entities: {
    folders: new Map(),
    notebooks: new Map(),
    notes: new Map(),
    quizzes: new Map(),
  },
  
  metadata: {
    permissions: new Map(),
    shareInvitations: new Map(),
  },
  
  indexes: {
    notebooksByFolder: new Map(),
    notesByNotebook: new Map(),
  },
  
  // Bulk setters
  setFolders: (folders) => set(() => ({
    entities: {
      ...get().entities,
      folders: new Map(folders.map(f => [f.id, f]))
    }
  })),
  
  setNotebooks: (notebooks) => {
    const notebooksByFolder = new Map<string, Set<string>>()
    notebooks.forEach(notebook => {
      if (!notebooksByFolder.has(notebook.folder_id)) {
        notebooksByFolder.set(notebook.folder_id, new Set())
      }
      notebooksByFolder.get(notebook.folder_id)!.add(notebook.id)
    })
    
    set(() => ({
      entities: {
        ...get().entities,
        notebooks: new Map(notebooks.map(n => [n.id, n]))
      },
      indexes: {
        ...get().indexes,
        notebooksByFolder
      }
    }))
  },
  
  setNotes: (notes) => {
    const notesByNotebook = new Map<string, Set<string>>()
    notes.forEach(note => {
      if (!notesByNotebook.has(note.notebook_id)) {
        notesByNotebook.set(note.notebook_id, new Set())
      }
      notesByNotebook.get(note.notebook_id)!.add(note.id)
    })
    
    set(() => ({
      entities: {
        ...get().entities,
        notes: new Map(notes.map(n => [n.id, n]))
      },
      indexes: {
        ...get().indexes,
        notesByNotebook
      }
    }))
  },
  
  setQuizzes: (quizzes) => set(() => ({
    entities: {
      ...get().entities,
      quizzes: new Map(quizzes.map(q => [q.id, q]))
    }
  })),
  
  setPermissions: (permissions) => set(() => ({
    metadata: {
      ...get().metadata,
      permissions
    }
  })),
  
  setShareInvitations: (invitations) => set(() => ({
    metadata: {
      ...get().metadata,
      shareInvitations: invitations
    }
  })),
  
  // Individual operations
  addFolder: (folder) => set((state) => {
    const newFolders = new Map(state.entities.folders)
    newFolders.set(folder.id, folder)
    return {
      entities: {
        ...state.entities,
        folders: newFolders
      }
    }
  }),
  
  updateFolder: (id, updates) => set((state) => {
    const folder = state.entities.folders.get(id)
    if (!folder) return state
    
    const newFolders = new Map(state.entities.folders)
    newFolders.set(id, { ...folder, ...updates })
    return {
      entities: {
        ...state.entities,
        folders: newFolders
      }
    }
  }),
  
  removeFolder: (id) => set((state) => {
    const newFolders = new Map(state.entities.folders)
    const newNotebooks = new Map(state.entities.notebooks)
    const newNotes = new Map(state.entities.notes)
    const newNotebooksByFolder = new Map(state.indexes.notebooksByFolder)
    const newNotesByNotebook = new Map(state.indexes.notesByNotebook)
    
    // Remove folder
    newFolders.delete(id)
    
    // Remove all notebooks in this folder and their notes
    const notebookIds = state.indexes.notebooksByFolder.get(id) || new Set()
    notebookIds.forEach(notebookId => {
      newNotebooks.delete(notebookId)
      
      // Remove all notes in this notebook
      const noteIds = state.indexes.notesByNotebook.get(notebookId) || new Set()
      noteIds.forEach(noteId => newNotes.delete(noteId))
      newNotesByNotebook.delete(notebookId)
    })
    newNotebooksByFolder.delete(id)
    
    return {
      entities: {
        ...state.entities,
        folders: newFolders,
        notebooks: newNotebooks,
        notes: newNotes
      },
      indexes: {
        ...state.indexes,
        notebooksByFolder: newNotebooksByFolder,
        notesByNotebook: newNotesByNotebook
      }
    }
  }),
  
  addNotebook: (notebook) => set((state) => {
    const newNotebooks = new Map(state.entities.notebooks)
    newNotebooks.set(notebook.id, notebook)
    
    const newNotebooksByFolder = new Map(state.indexes.notebooksByFolder)
    if (!newNotebooksByFolder.has(notebook.folder_id)) {
      newNotebooksByFolder.set(notebook.folder_id, new Set())
    }
    const folderNotebooks = new Set(newNotebooksByFolder.get(notebook.folder_id))
    folderNotebooks.add(notebook.id)
    newNotebooksByFolder.set(notebook.folder_id, folderNotebooks)
    
    return {
      entities: {
        ...state.entities,
        notebooks: newNotebooks
      },
      indexes: {
        ...state.indexes,
        notebooksByFolder: newNotebooksByFolder
      }
    }
  }),
  
  updateNotebook: (id, updates) => set((state) => {
    const notebook = state.entities.notebooks.get(id)
    if (!notebook) return state
    
    const updated = { ...notebook, ...updates }
    const newNotebooks = new Map(state.entities.notebooks)
    newNotebooks.set(id, updated)
    
    let newNotebooksByFolder = state.indexes.notebooksByFolder
    
    // Update folder index if folder changed
    if (updates.folder_id && updates.folder_id !== notebook.folder_id) {
      newNotebooksByFolder = new Map(state.indexes.notebooksByFolder)
      
      // Remove from old folder
      const oldFolderNotebooks = new Set(newNotebooksByFolder.get(notebook.folder_id))
      oldFolderNotebooks.delete(id)
      if (oldFolderNotebooks.size > 0) {
        newNotebooksByFolder.set(notebook.folder_id, oldFolderNotebooks)
      } else {
        newNotebooksByFolder.delete(notebook.folder_id)
      }
      
      // Add to new folder
      if (!newNotebooksByFolder.has(updates.folder_id)) {
        newNotebooksByFolder.set(updates.folder_id, new Set())
      }
      const newFolderNotebooks = new Set(newNotebooksByFolder.get(updates.folder_id))
      newFolderNotebooks.add(id)
      newNotebooksByFolder.set(updates.folder_id, newFolderNotebooks)
    }
    
    return {
      entities: {
        ...state.entities,
        notebooks: newNotebooks
      },
      indexes: {
        ...state.indexes,
        notebooksByFolder: newNotebooksByFolder
      }
    }
  }),
  
  removeNotebook: (id) => set((state) => {
    const notebook = state.entities.notebooks.get(id)
    if (!notebook) return state
    
    const newNotebooks = new Map(state.entities.notebooks)
    const newNotes = new Map(state.entities.notes)
    const newNotebooksByFolder = new Map(state.indexes.notebooksByFolder)
    const newNotesByNotebook = new Map(state.indexes.notesByNotebook)
    
    // Remove notebook
    newNotebooks.delete(id)
    
    // Update folder index
    const folderNotebooks = new Set(newNotebooksByFolder.get(notebook.folder_id))
    folderNotebooks.delete(id)
    if (folderNotebooks.size > 0) {
      newNotebooksByFolder.set(notebook.folder_id, folderNotebooks)
    } else {
      newNotebooksByFolder.delete(notebook.folder_id)
    }
    
    // Remove all notes in this notebook
    const noteIds = state.indexes.notesByNotebook.get(id) || new Set()
    noteIds.forEach(noteId => newNotes.delete(noteId))
    newNotesByNotebook.delete(id)
    
    return {
      entities: {
        ...state.entities,
        notebooks: newNotebooks,
        notes: newNotes
      },
      indexes: {
        ...state.indexes,
        notebooksByFolder: newNotebooksByFolder,
        notesByNotebook: newNotesByNotebook
      }
    }
  }),
  
  addNote: (note) => set((state) => {
    const newNotes = new Map(state.entities.notes)
    newNotes.set(note.id, note)
    
    const newNotesByNotebook = new Map(state.indexes.notesByNotebook)
    if (!newNotesByNotebook.has(note.notebook_id)) {
      newNotesByNotebook.set(note.notebook_id, new Set())
    }
    const notebookNotes = new Set(newNotesByNotebook.get(note.notebook_id))
    notebookNotes.add(note.id)
    newNotesByNotebook.set(note.notebook_id, notebookNotes)
    
    return {
      entities: {
        ...state.entities,
        notes: newNotes
      },
      indexes: {
        ...state.indexes,
        notesByNotebook: newNotesByNotebook
      }
    }
  }),
  
  updateNote: (id, updates) => set((state) => {
    const note = state.entities.notes.get(id)
    if (!note) return state
    
    const newNotes = new Map(state.entities.notes)
    newNotes.set(id, { ...note, ...updates })
    
    return {
      entities: {
        ...state.entities,
        notes: newNotes
      }
    }
  }),
  
  removeNote: (id) => set((state) => {
    const note = state.entities.notes.get(id)
    if (!note) return state
    
    const newNotes = new Map(state.entities.notes)
    const newNotesByNotebook = new Map(state.indexes.notesByNotebook)
    
    // Remove note
    newNotes.delete(id)
    
    // Update notebook index
    const notebookNotes = new Set(newNotesByNotebook.get(note.notebook_id))
    notebookNotes.delete(id)
    if (notebookNotes.size > 0) {
      newNotesByNotebook.set(note.notebook_id, notebookNotes)
    } else {
      newNotesByNotebook.delete(note.notebook_id)
    }
    
    return {
      entities: {
        ...state.entities,
        notes: newNotes
      },
      indexes: {
        ...state.indexes,
        notesByNotebook: newNotesByNotebook
      }
    }
  }),
  
  // Getters
  getFolder: (id) => get().entities.folders.get(id),
  getNotebook: (id) => get().entities.notebooks.get(id),
  getNote: (id) => get().entities.notes.get(id),
  
  getNotebooksInFolder: (folderId) => {
    const state = get()
    const notebookIds = state.indexes.notebooksByFolder.get(folderId) || new Set()
    return Array.from(notebookIds)
      .map(id => state.entities.notebooks.get(id))
      .filter((n): n is Notebook => n !== undefined)
  },
  
  getNotesInNotebook: (notebookId) => {
    const state = get()
    const noteIds = state.indexes.notesByNotebook.get(notebookId) || new Set()
    return Array.from(noteIds)
      .map(id => state.entities.notes.get(id))
      .filter((n): n is Note => n !== undefined)
  },
  
  clearAll: () => set(() => ({
    entities: {
      folders: new Map(),
      notebooks: new Map(),
      notes: new Map(),
      quizzes: new Map(),
    },
    metadata: {
      permissions: new Map(),
      shareInvitations: new Map(),
    },
    indexes: {
      notebooksByFolder: new Map(),
      notesByNotebook: new Map(),
    }
  })),
}))