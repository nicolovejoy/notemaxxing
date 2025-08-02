import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Folder, Notebook, Note, Quiz, QuizQuestion, SyncState, OptimisticUpdate } from './types'
import { foldersApi, notebooksApi, notesApi, quizzesApi } from './supabase-helpers'
import { SeedService } from '../seed-templates'
import { createClient } from '../supabase/client'

interface AppState {
  // Data
  folders: Folder[]
  notebooks: Notebook[]
  notes: Note[]
  quizzes: Quiz[]
  
  // UI State
  selectedFolderId: string | null
  selectedNotebookId: string | null
  
  // Sort & Search State
  notebookSort: 'recent' | 'alphabetical' | 'created' | 'alphabetical-reverse' | 'created-reverse'
  globalSearch: string
  
  // Sync State
  syncState: SyncState
  optimisticUpdates: OptimisticUpdate<Folder | Notebook | Note | Quiz>[]
  initialized: boolean
  
  // Actions - Folders
  loadFolders: () => Promise<void>
  createFolder: (name: string, color: string) => Promise<void>
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  
  // Actions - Notebooks
  loadNotebooks: (includeArchived?: boolean) => Promise<void>
  createNotebook: (name: string, folderId: string, color: string) => Promise<void>
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>
  archiveNotebook: (id: string) => Promise<void>
  restoreNotebook: (id: string) => Promise<void>
  deleteNotebook: (id: string) => Promise<void>
  
  // Actions - Notes
  loadNotes: () => Promise<void>
  loadNotesByNotebook: (notebookId: string) => Promise<void>
  createNote: (title: string, content: string, notebookId: string) => Promise<Note>
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  
  // Actions - Quizzes
  loadQuizzes: () => Promise<void>
  createQuiz: (subject: string, questions: QuizQuestion[]) => Promise<void>
  updateQuiz: (id: string, updates: Partial<Quiz>) => Promise<void>
  deleteQuiz: (id: string) => Promise<void>
  
  // UI Actions
  setSelectedFolder: (id: string | null) => void
  setSelectedNotebook: (id: string | null) => void
  setNotebookSort: (sort: AppState['notebookSort']) => void
  setGlobalSearch: (search: string) => void
  
  // Utility Actions
  clearOptimisticUpdate: (id: string) => void
  setSyncError: (error: string | null) => void
  initializeStore: () => Promise<void>
  resetStore: () => void
  loadPreferences: () => void
  savePreferences: () => void
  seedInitialData: (templateId?: string) => Promise<{ success: boolean; error?: string }>
}

export const useStore = create<AppState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      folders: [],
      notebooks: [],
      notes: [],
      quizzes: [],
      selectedFolderId: null,
      selectedNotebookId: null,
      notebookSort: 'recent',
      globalSearch: '',
      syncState: {
        status: 'idle',
        error: null,
        lastSyncTime: null,
      },
      optimisticUpdates: [],
      initialized: false,

      // Folder Actions
      loadFolders: async () => {
        set((state) => {
          state.syncState.status = 'loading'
          state.syncState.error = null
        })
        
        try {
          const folders = await foldersApi.getAll()
          set((state) => {
            state.folders = folders
            state.syncState.status = 'idle'
            state.syncState.lastSyncTime = new Date()
          })
        } catch (error) {
          set((state) => {
            state.syncState.status = 'error'
            state.syncState.error = error instanceof Error ? error.message : 'Failed to load folders'
          })
        }
      },

      createFolder: async (name: string, color: string) => {
        const tempId = `temp-${Date.now()}`
        const tempFolder: Folder = {
          id: tempId,
          user_id: 'temp',
          name,
          color,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Optimistic update
        set((state) => {
          state.folders.push(tempFolder)
          state.optimisticUpdates.push({
            id: tempId,
            type: 'create',
            data: tempFolder,
            timestamp: Date.now(),
          })
        })

        try {
          const newFolder = await foldersApi.create({ name, color })
          set((state) => {
            const index = state.folders.findIndex((f: Folder) => f.id === tempId)
            if (index !== -1) {
              state.folders[index] = newFolder
            }
            state.optimisticUpdates = state.optimisticUpdates.filter((u: OptimisticUpdate<Folder | Notebook | Note | Quiz>) => u.id !== tempId)
          })
        } catch (error) {
          // Rollback on error
          set((state) => {
            state.folders = state.folders.filter((f: Folder) => f.id !== tempId)
            state.optimisticUpdates = state.optimisticUpdates.filter((u: OptimisticUpdate<Folder | Notebook | Note | Quiz>) => u.id !== tempId)
            state.syncState.error = error instanceof Error ? error.message : 'Failed to create folder'
          })
          throw error
        }
      },

      updateFolder: async (id: string, updates: Partial<Folder>) => {
        const originalFolder = get().folders.find((f: Folder) => f.id === id)
        if (!originalFolder) return

        // Optimistic update
        set((state) => {
          const index = state.folders.findIndex((f: Folder) => f.id === id)
          if (index !== -1) {
            state.folders[index] = { ...state.folders[index], ...updates }
          }
        })

        try {
          const updatedFolder = await foldersApi.update(id, updates)
          set((state) => {
            const index = state.folders.findIndex((f: Folder) => f.id === id)
            if (index !== -1) {
              state.folders[index] = updatedFolder
            }
          })
        } catch (error) {
          // Rollback
          set((state) => {
            const index = state.folders.findIndex((f: Folder) => f.id === id)
            if (index !== -1) {
              state.folders[index] = originalFolder
            }
            state.syncState.error = error instanceof Error ? error.message : 'Failed to update folder'
          })
          throw error
        }
      },

      deleteFolder: async (id: string) => {
        const originalFolders = get().folders
        const originalNotebooks = get().notebooks
        const originalNotes = get().notes

        // Optimistic update - remove folder and all its contents
        set((state) => {
          state.folders = state.folders.filter((f: Folder) => f.id !== id)
          const notebookIds = state.notebooks.filter((n: Notebook) => n.folder_id === id).map((n: Notebook) => n.id)
          state.notebooks = state.notebooks.filter((n: Notebook) => n.folder_id !== id)
          state.notes = state.notes.filter((n: Note) => !notebookIds.includes(n.notebook_id))
        })

        try {
          await foldersApi.delete(id)
        } catch (error) {
          // Rollback
          set((state) => {
            state.folders = originalFolders
            state.notebooks = originalNotebooks
            state.notes = originalNotes
            state.syncState.error = error instanceof Error ? error.message : 'Failed to delete folder'
          })
          throw error
        }
      },

      // Notebook Actions
      loadNotebooks: async (includeArchived = false) => {
        set((state) => {
          state.syncState.status = 'loading'
          state.syncState.error = null
        })
        
        try {
          const notebooks = await notebooksApi.getAll(includeArchived)
          set((state) => {
            state.notebooks = notebooks
            state.syncState.status = 'idle'
            state.syncState.lastSyncTime = new Date()
          })
        } catch (error) {
          set((state) => {
            state.syncState.status = 'error'
            state.syncState.error = error instanceof Error ? error.message : 'Failed to load notebooks'
          })
        }
      },

      createNotebook: async (name: string, folderId: string, color: string) => {
        const tempId = `temp-${Date.now()}`
        const tempNotebook: Notebook = {
          id: tempId,
          user_id: 'temp',
          folder_id: folderId,
          name,
          color,
          archived: false,
          archived_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Optimistic update
        set((state) => {
          state.notebooks.push(tempNotebook)
          state.optimisticUpdates.push({
            id: tempId,
            type: 'create',
            data: tempNotebook,
            timestamp: Date.now(),
          })
        })

        try {
          const newNotebook = await notebooksApi.create({ name, folder_id: folderId, color })
          set((state) => {
            const index = state.notebooks.findIndex((n: Notebook) => n.id === tempId)
            if (index !== -1) {
              state.notebooks[index] = newNotebook
            }
            state.optimisticUpdates = state.optimisticUpdates.filter((u: OptimisticUpdate<Folder | Notebook | Note | Quiz>) => u.id !== tempId)
          })
        } catch (error) {
          // Rollback
          set((state) => {
            state.notebooks = state.notebooks.filter((n: Notebook) => n.id !== tempId)
            state.optimisticUpdates = state.optimisticUpdates.filter((u: OptimisticUpdate<Folder | Notebook | Note | Quiz>) => u.id !== tempId)
            state.syncState.error = error instanceof Error ? error.message : 'Failed to create notebook'
          })
          throw error
        }
      },

      updateNotebook: async (id: string, updates: Partial<Notebook>) => {
        const originalNotebook = get().notebooks.find((n: Notebook) => n.id === id)
        if (!originalNotebook) return

        // Optimistic update
        set((state) => {
          const index = state.notebooks.findIndex((n: Notebook) => n.id === id)
          if (index !== -1) {
            state.notebooks[index] = { ...state.notebooks[index], ...updates }
          }
        })

        try {
          const updatedNotebook = await notebooksApi.update(id, updates)
          set((state) => {
            const index = state.notebooks.findIndex((n: Notebook) => n.id === id)
            if (index !== -1) {
              state.notebooks[index] = updatedNotebook
            }
          })
        } catch (error) {
          // Rollback
          set((state) => {
            const index = state.notebooks.findIndex((n: Notebook) => n.id === id)
            if (index !== -1) {
              state.notebooks[index] = originalNotebook
            }
            state.syncState.error = error instanceof Error ? error.message : 'Failed to update notebook'
          })
          throw error
        }
      },

      archiveNotebook: async (id: string) => {
        await get().updateNotebook(id, { archived: true, archived_at: new Date().toISOString() })
      },

      restoreNotebook: async (id: string) => {
        await get().updateNotebook(id, { archived: false, archived_at: null })
      },

      deleteNotebook: async (id: string) => {
        const originalNotebooks = get().notebooks
        const originalNotes = get().notes

        // Optimistic update
        set((state) => {
          state.notebooks = state.notebooks.filter((n: Notebook) => n.id !== id)
          state.notes = state.notes.filter((n: Note) => n.notebook_id !== id)
        })

        try {
          await notebooksApi.delete(id)
        } catch (error) {
          // Rollback
          set((state) => {
            state.notebooks = originalNotebooks
            state.notes = originalNotes
            state.syncState.error = error instanceof Error ? error.message : 'Failed to delete notebook'
          })
          throw error
        }
      },

      // Note Actions
      loadNotes: async () => {
        set((state) => {
          state.syncState.status = 'loading'
          state.syncState.error = null
        })
        
        try {
          const notes = await notesApi.getAll()
          set((state) => {
            state.notes = notes
            state.syncState.status = 'idle'
            state.syncState.lastSyncTime = new Date()
          })
        } catch (error) {
          set((state) => {
            state.syncState.status = 'error'
            state.syncState.error = error instanceof Error ? error.message : 'Failed to load notes'
          })
        }
      },

      loadNotesByNotebook: async (notebookId: string) => {
        try {
          const notes = await notesApi.getByNotebook(notebookId)
          set((state) => {
            // Remove old notes for this notebook and add new ones
            state.notes = [
              ...state.notes.filter((n: Note) => n.notebook_id !== notebookId),
              ...notes
            ]
          })
        } catch (error) {
          set((state) => {
            state.syncState.error = error instanceof Error ? error.message : 'Failed to load notes'
          })
        }
      },

      createNote: async (title: string, content: string, notebookId: string) => {
        const tempId = `temp-${Date.now()}`
        const tempNote: Note = {
          id: tempId,
          user_id: 'temp',
          notebook_id: notebookId,
          title,
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Optimistic update
        set((state) => {
          state.notes.push(tempNote)
          state.optimisticUpdates.push({
            id: tempId,
            type: 'create',
            data: tempNote,
            timestamp: Date.now(),
          })
        })

        try {
          const newNote = await notesApi.create({ title, content, notebook_id: notebookId })
          set((state) => {
            const index = state.notes.findIndex((n: Note) => n.id === tempId)
            if (index !== -1) {
              state.notes[index] = newNote
            }
            state.optimisticUpdates = state.optimisticUpdates.filter((u: OptimisticUpdate<Folder | Notebook | Note | Quiz>) => u.id !== tempId)
          })
          return newNote
        } catch (error) {
          // Rollback
          set((state) => {
            state.notes = state.notes.filter((n: Note) => n.id !== tempId)
            state.optimisticUpdates = state.optimisticUpdates.filter((u: OptimisticUpdate<Folder | Notebook | Note | Quiz>) => u.id !== tempId)
            state.syncState.error = error instanceof Error ? error.message : 'Failed to create note'
          })
          throw error
        }
      },

      updateNote: async (id: string, updates: Partial<Note>) => {
        const originalNote = get().notes.find((n: Note) => n.id === id)
        if (!originalNote) return

        // Optimistic update
        set((state) => {
          const index = state.notes.findIndex((n: Note) => n.id === id)
          if (index !== -1) {
            state.notes[index] = { ...state.notes[index], ...updates }
          }
        })

        try {
          const updatedNote = await notesApi.update(id, updates)
          set((state) => {
            const index = state.notes.findIndex((n: Note) => n.id === id)
            if (index !== -1) {
              state.notes[index] = updatedNote
            }
          })
        } catch (error) {
          // Rollback
          set((state) => {
            const index = state.notes.findIndex((n: Note) => n.id === id)
            if (index !== -1) {
              state.notes[index] = originalNote
            }
            state.syncState.error = error instanceof Error ? error.message : 'Failed to update note'
          })
          throw error
        }
      },

      deleteNote: async (id: string) => {
        const originalNotes = get().notes

        // Optimistic update
        set((state) => {
          state.notes = state.notes.filter((n: Note) => n.id !== id)
        })

        try {
          await notesApi.delete(id)
        } catch (error) {
          // Rollback
          set((state) => {
            state.notes = originalNotes
            state.syncState.error = error instanceof Error ? error.message : 'Failed to delete note'
          })
          throw error
        }
      },

      // Quiz Actions
      loadQuizzes: async () => {
        set((state) => {
          state.syncState.status = 'loading'
          state.syncState.error = null
        })
        
        try {
          const quizzes = await quizzesApi.getAll()
          set((state) => {
            state.quizzes = quizzes
            state.syncState.status = 'idle'
            state.syncState.lastSyncTime = new Date()
          })
        } catch (error) {
          set((state) => {
            state.syncState.status = 'error'
            state.syncState.error = error instanceof Error ? error.message : 'Failed to load quizzes'
          })
        }
      },

      createQuiz: async (subject: string, questions: QuizQuestion[]) => {
        const tempId = `temp-${Date.now()}`
        const tempQuiz: Quiz = {
          id: tempId,
          user_id: 'temp',
          subject,
          questions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Optimistic update
        set((state) => {
          state.quizzes.push(tempQuiz)
        })

        try {
          const newQuiz = await quizzesApi.create({ subject, questions })
          set((state) => {
            const index = state.quizzes.findIndex((q: Quiz) => q.id === tempId)
            if (index !== -1) {
              state.quizzes[index] = newQuiz
            }
          })
        } catch (error) {
          // Rollback
          set((state) => {
            state.quizzes = state.quizzes.filter((q: Quiz) => q.id !== tempId)
            state.syncState.error = error instanceof Error ? error.message : 'Failed to create quiz'
          })
          throw error
        }
      },

      updateQuiz: async (id: string, updates: Partial<Quiz>) => {
        const originalQuiz = get().quizzes.find((q: Quiz) => q.id === id)
        if (!originalQuiz) return

        // Optimistic update
        set((state) => {
          const index = state.quizzes.findIndex((q: Quiz) => q.id === id)
          if (index !== -1) {
            state.quizzes[index] = { ...state.quizzes[index], ...updates }
          }
        })

        try {
          const updatedQuiz = await quizzesApi.update(id, updates)
          set((state) => {
            const index = state.quizzes.findIndex((q: Quiz) => q.id === id)
            if (index !== -1) {
              state.quizzes[index] = updatedQuiz
            }
          })
        } catch (error) {
          // Rollback
          set((state) => {
            const index = state.quizzes.findIndex((q: Quiz) => q.id === id)
            if (index !== -1) {
              state.quizzes[index] = originalQuiz
            }
            state.syncState.error = error instanceof Error ? error.message : 'Failed to update quiz'
          })
          throw error
        }
      },

      deleteQuiz: async (id: string) => {
        const originalQuizzes = get().quizzes

        // Optimistic update
        set((state) => {
          state.quizzes = state.quizzes.filter((q: Quiz) => q.id !== id)
        })

        try {
          await quizzesApi.delete(id)
        } catch (error) {
          // Rollback
          set((state) => {
            state.quizzes = originalQuizzes
            state.syncState.error = error instanceof Error ? error.message : 'Failed to delete quiz'
          })
          throw error
        }
      },

      // UI Actions
      setSelectedFolder: (id: string | null) => set((state) => {
        state.selectedFolderId = id
      }),

      setSelectedNotebook: (id: string | null) => set((state) => {
        state.selectedNotebookId = id
      }),
      
      setNotebookSort: (sort: AppState['notebookSort']) => {
        set((state) => {
          state.notebookSort = sort
        })
        get().savePreferences()
      },
      
      setGlobalSearch: (search: string) => set((state) => {
        state.globalSearch = search
      }),

      // Utility Actions
      clearOptimisticUpdate: (id: string) => set((state) => {
        state.optimisticUpdates = state.optimisticUpdates.filter((u: OptimisticUpdate<Folder | Notebook | Note | Quiz>) => u.id !== id)
      }),

      setSyncError: (error: string | null) => set((state) => {
        state.syncState.error = error
      }),

      initializeStore: async () => {
        const state = get()
        
        // Prevent duplicate initialization
        if (state.initialized || state.syncState.status === 'loading') {
          console.log('[Store] Skipping initialization - already initialized or loading')
          return
        }

        // Check if we have an authenticated user
        const supabase = createClient()
        if (!supabase) {
          console.log('[Store] No Supabase client available')
          return
        }
        
        // First check session to ensure auth cookies are set
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('[Store] Error getting session:', sessionError)
          throw new Error(`Failed to get session: ${sessionError.message}`)
        }
        
        if (!session) {
          console.log('[Store] No active session, skipping initialization')
          return
        }
        
        // Double-check with getUser for extra validation
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.error('[Store] Error getting user:', userError)
          throw new Error(`Failed to get user: ${userError.message}`)
        }
        
        if (!user) {
          console.log('[Store] No authenticated user found despite session')
          return
        }

        console.log(`[Store] Starting initialization for user: ${user.email}`)
        set((state) => {
          state.syncState.status = 'loading'
          state.syncState.error = null
        })

        try {
          // Load preferences first
          get().loadPreferences()
          
          console.log('[Store] Loading all data...')
          const results = await Promise.allSettled([
            get().loadFolders(),
            get().loadNotebooks(),
            get().loadNotes(),
            get().loadQuizzes(),
          ])
          
          // Check if any loads failed
          const failures = results.filter(r => r.status === 'rejected')
          if (failures.length > 0) {
            const errorMessages = failures.map((f, i) => {
              const errorMsg = (f as PromiseRejectedResult).reason?.message || 'Unknown error'
              const dataType = ['folders', 'notebooks', 'notes', 'quizzes'][i]
              return `${dataType}: ${errorMsg}`
            }).join(', ')
            
            console.error('[Store] Some data failed to load:', errorMessages)
            
            // If critical data (folders/notebooks) failed, throw error
            if (results[0].status === 'rejected' || results[1].status === 'rejected') {
              throw new Error(`Critical data failed to load: ${errorMessages}`)
            }
          }
          
          set((state) => {
            state.initialized = true
            state.syncState.status = 'idle'
            state.syncState.lastSyncTime = new Date()
          })
          console.log('[Store] Initialization complete')
        } catch (error) {
          set((state) => {
            state.syncState.status = 'error'
            state.syncState.error = error instanceof Error ? error.message : 'Failed to initialize store'
          })
          console.error('[Store] Failed to initialize:', error)
          throw error // Re-throw to be caught by StoreProvider
        }
      },
      
      resetStore: () => {
        console.log('[Store] Resetting store state')
        set((state) => {
          state.folders = []
          state.notebooks = []
          state.notes = []
          state.quizzes = []
          state.selectedFolderId = null
          state.selectedNotebookId = null
          state.syncState = {
            status: 'idle',
            error: null,
            lastSyncTime: null,
          }
          state.optimisticUpdates = []
          state.initialized = false
        })
      },
      
      loadPreferences: () => {
        try {
          const stored = localStorage.getItem('notemaxxing-preferences')
          if (stored) {
            const preferences = JSON.parse(stored)
            set((state) => {
              if (preferences.notebookSort) state.notebookSort = preferences.notebookSort
            })
          }
        } catch (error) {
          console.error('[Store] Failed to load preferences:', error)
        }
      },
      
      savePreferences: () => {
        try {
          const state = get()
          const preferences = {
            notebookSort: state.notebookSort,
          }
          localStorage.setItem('notemaxxing-preferences', JSON.stringify(preferences))
        } catch (error) {
          console.error('[Store] Failed to save preferences:', error)
        }
      },

      seedInitialData: async (templateId?: string) => {
        try {
          set((state) => {
            state.syncState.status = 'loading'
          })

          // Get current user
          const supabase = createClient()
          if (!supabase) {
            throw new Error('Supabase client not available')
          }
          
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            throw new Error('No authenticated user found')
          }

          // Check if user already has data
          const seedService = new SeedService(supabase)
          const hasData = await seedService.checkIfUserHasData(user.id)
          
          if (hasData) {
            return { 
              success: false, 
              error: 'User already has data. Seed data is only for new users.' 
            }
          }

          // Seed the data
          const result = await seedService.seedUserData({
            userId: user.id,
            templateId,
          })

          if (result.success) {
            // Reload all data to reflect the seeded content
            await get().loadFolders()
            await get().loadNotebooks(true)
            await get().loadNotes()
          }

          set((state) => {
            state.syncState.status = 'idle'
          })

          return result
        } catch (error) {
          console.error('[Store] Seed data error:', error)
          set((state) => {
            state.syncState.status = 'idle'
            state.syncState.error = error instanceof Error ? error.message : 'Failed to seed data'
          })
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to seed data' 
          }
        }
      },
    })),
    {
      name: 'notemaxxing-store',
    }
  )
)