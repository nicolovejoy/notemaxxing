import { dataStore } from './data-store'
import { foldersApi, notebooksApi, notesApi, sharesApi } from './supabase-helpers'
import { createClient } from '../supabase/client'
import { SeedService } from '../seed-templates'
import { RealtimeManager } from './realtime-manager'
import type { Folder, Notebook, Note, OptimisticUpdate } from './types'

export interface DataManagerState {
  optimisticUpdates: OptimisticUpdate<Folder | Notebook | Note>[]
  initialized: boolean
}

class DataManager {
  private state: DataManagerState = {
    optimisticUpdates: [],
    initialized: false,
  }

  // Realtime manager
  private realtimeManager: RealtimeManager

  // Singleton instance
  private static instance: DataManager

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager()
    }
    return DataManager.instance
  }

  private constructor() {
    this.realtimeManager = RealtimeManager.getInstance()
  }

  // State getters
  isInitialized() {
    return this.state.initialized
  }

  // Initialize all data
  async initialize(): Promise<void> {
    // Prevent duplicate initialization
    const currentStatus = dataStore.getState().syncState.status
    if (this.state.initialized || currentStatus === 'loading') {
      // Already initialized or loading
      return
    }

    const supabase = createClient()
    if (!supabase) {
      // No Supabase client available
      return
    }

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      // No active session
      return
    }

    // Starting initialization
    dataStore.getState().setSyncStatus('loading')
    dataStore.getState().setSyncError(null)

    try {
      // Load all entities in parallel
      const [folders, notebooks, notes, shares] = await Promise.all([
        foldersApi.getAll(true), // Include shared folders
        notebooksApi.getAll(true), // Include archived
        notesApi.getAll(), // Load all notes upfront
        sharesApi.getShareMetadata(),
      ])

      // Update data store
      dataStore.getState().setFolders(folders)
      dataStore.getState().setNotebooks(notebooks)
      dataStore.getState().setNotes(notes)

      // Process share metadata
      if (shares) {
        const permissionsMap = new Map()
        const invitationsMap = new Map()

        shares.permissions?.forEach((p) => {
          const key = `${p.resource_type}:${p.resource_id}`
          if (!permissionsMap.has(key)) {
            permissionsMap.set(key, [])
          }
          permissionsMap.get(key).push(p)
        })

        shares.invitations?.forEach((i) => {
          invitationsMap.set(i.id, i)
        })

        dataStore.getState().setPermissions(permissionsMap)
        dataStore.getState().setShareInvitations(invitationsMap)
      }

      this.state.initialized = true
      dataStore.getState().setSyncStatus('idle')
      dataStore.getState().setSyncTime(new Date())

      // Initialize realtime sync
      await this.realtimeManager.initialize(session.user.id)

      // Initialization complete
    } catch (error) {
      dataStore.getState().setSyncStatus('error')
      dataStore
        .getState()
        .setSyncError(error instanceof Error ? error.message : 'Failed to initialize')
      console.error('[DataManager] Failed to initialize:', error)
      throw error
    }
  }

  // Load notes for a specific notebook
  async loadNotesForNotebook(notebookId: string): Promise<void> {
    try {
      const notes = await notesApi.getByNotebook(notebookId)

      // Get current notes and remove old ones for this notebook
      const currentNotes = Array.from(dataStore.getState().entities.notes.values())
      const otherNotes = currentNotes.filter((n) => n.notebook_id !== notebookId)

      // Set all notes (other notebooks + new notes for this notebook)
      dataStore.getState().setNotes([...otherNotes, ...notes])
    } catch (error) {
      console.error('[DataManager] Failed to load notes:', error)
      throw error
    }
  }

  // Folder operations
  async createFolder(name: string, color: string): Promise<Folder> {
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
    dataStore.getState().addFolder(tempFolder)
    this.state.optimisticUpdates.push({
      id: tempId,
      type: 'create',
      data: tempFolder,
      timestamp: Date.now(),
    })

    try {
      const newFolder = await foldersApi.create({ name, color })

      // Replace temp with real
      dataStore.getState().removeFolder(tempId)
      dataStore.getState().addFolder(newFolder)

      // Clear optimistic update
      this.state.optimisticUpdates = this.state.optimisticUpdates.filter((u) => u.id !== tempId)

      return newFolder
    } catch (error) {
      // Rollback
      dataStore.getState().removeFolder(tempId)
      this.state.optimisticUpdates = this.state.optimisticUpdates.filter((u) => u.id !== tempId)
      throw error
    }
  }

  async updateFolder(id: string, updates: Partial<Folder>): Promise<void> {
    const original = dataStore.getState().getFolder(id)
    if (!original) return

    // Optimistic update
    dataStore.getState().updateFolder(id, updates)

    try {
      const updated = await foldersApi.update(id, updates)

      // Preserve shared and permission properties from original
      const finalFolder = {
        ...updated,
        shared: original.shared,
        permission: original.permission,
      }

      dataStore.getState().updateFolder(id, finalFolder)
    } catch (error) {
      console.error('[DataManager] Update failed:', error)
      // Rollback
      dataStore.getState().updateFolder(id, original)
      throw error
    }
  }

  async deleteFolder(id: string): Promise<void> {
    // Store state for rollback
    const folder = dataStore.getState().getFolder(id)
    const notebooks = dataStore.getState().getNotebooksInFolder(id)
    const allNotes: Note[] = []
    notebooks.forEach((notebook) => {
      allNotes.push(...dataStore.getState().getNotesInNotebook(notebook.id))
    })

    // Optimistic update
    dataStore.getState().removeFolder(id)

    try {
      await foldersApi.delete(id)
    } catch (error) {
      // Rollback
      if (folder) dataStore.getState().addFolder(folder)
      notebooks.forEach((n) => dataStore.getState().addNotebook(n))
      allNotes.forEach((n) => dataStore.getState().addNote(n))
      throw error
    }
  }

  // Notebook operations
  async createNotebook(name: string, folderId: string, color: string): Promise<Notebook> {
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
    dataStore.getState().addNotebook(tempNotebook)

    try {
      const newNotebook = await notebooksApi.create({ name, folder_id: folderId, color })

      // Replace temp with real
      dataStore.getState().removeNotebook(tempId)
      dataStore.getState().addNotebook(newNotebook)

      return newNotebook
    } catch (error) {
      // Rollback
      dataStore.getState().removeNotebook(tempId)
      throw error
    }
  }

  async updateNotebook(id: string, updates: Partial<Notebook>): Promise<void> {
    const original = dataStore.getState().getNotebook(id)
    if (!original) return

    // Optimistic update
    dataStore.getState().updateNotebook(id, updates)

    try {
      const updated = await notebooksApi.update(id, updates)
      dataStore.getState().updateNotebook(id, updated)
    } catch (error) {
      // Rollback
      dataStore.getState().updateNotebook(id, original)
      throw error
    }
  }

  async deleteNotebook(id: string): Promise<void> {
    // Store state for rollback
    const notebook = dataStore.getState().getNotebook(id)
    const notes = dataStore.getState().getNotesInNotebook(id)

    // Optimistic update
    dataStore.getState().removeNotebook(id)

    try {
      await notebooksApi.delete(id)
    } catch (error) {
      // Rollback
      if (notebook) dataStore.getState().addNotebook(notebook)
      notes.forEach((n) => dataStore.getState().addNote(n))
      throw error
    }
  }

  // Note operations
  async createNote(title: string, content: string, notebookId: string): Promise<Note> {
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
    dataStore.getState().addNote(tempNote)

    try {
      const newNote = await notesApi.create({ title, content, notebook_id: notebookId })

      // Replace temp with real
      dataStore.getState().removeNote(tempId)
      dataStore.getState().addNote(newNote)

      return newNote
    } catch (error) {
      // Rollback
      dataStore.getState().removeNote(tempId)
      throw error
    }
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<void> {
    const original = dataStore.getState().getNote(id)
    if (!original) return

    // Optimistic update
    dataStore.getState().updateNote(id, updates)

    try {
      const updated = await notesApi.update(id, updates)
      dataStore.getState().updateNote(id, updated)
    } catch (error) {
      // Rollback
      dataStore.getState().updateNote(id, original)
      throw error
    }
  }

  async deleteNote(id: string): Promise<void> {
    const note = dataStore.getState().getNote(id)

    // Optimistic update
    dataStore.getState().removeNote(id)

    try {
      await notesApi.delete(id)
    } catch (error) {
      // Rollback
      if (note) dataStore.getState().addNote(note)
      throw error
    }
  }

  // Utility methods
  reset(): void {
    dataStore.getState().clearAll()
    dataStore.getState().setSyncStatus('idle')
    dataStore.getState().setSyncError(null)
    this.state = {
      optimisticUpdates: [],
      initialized: false,
    }
  }

  // Force refresh all data
  async refresh(): Promise<void> {
    // console.log('[DataManager] Forcing data refresh')

    // Temporarily set initialized to false to force reload
    const wasInitialized = this.state.initialized
    this.state.initialized = false

    try {
      await this.initialize()
      // console.log('[DataManager] Data refresh completed')
    } catch (error) {
      console.error('[DataManager] Data refresh failed:', error)
      // Restore initialized state on error
      this.state.initialized = wasInitialized
      throw error
    }
  }

  async seedInitialData(templateId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No authenticated user found')
      }

      const seedService = new SeedService(supabase)
      const hasData = await seedService.checkIfUserHasData(user.id)

      if (hasData) {
        return {
          success: false,
          error: 'User already has data. Seed data is only for new users.',
        }
      }

      const result = await seedService.seedUserData({
        userId: user.id,
        templateId,
      })

      if (result.success) {
        // Reinitialize to load seeded data
        await this.initialize()
      }

      return result
    } catch (error) {
      console.error('[DataManager] Seed data error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to seed data',
      }
    }
  }

  // Cleanup on logout
  async cleanup(): Promise<void> {
    console.log('[DataManager] Cleaning up...')

    // Disconnect realtime
    await this.realtimeManager.disconnect()

    // Clear state
    dataStore.getState().clearAll()
    this.state.initialized = false
    this.state.optimisticUpdates = []

    console.log('[DataManager] Cleanup complete')
  }
}

// Export singleton instance
export const dataManager = DataManager.getInstance()
