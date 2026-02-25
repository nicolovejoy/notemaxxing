// Stub — data management now handled by React Query + API routes
// These methods are retained for compatibility with useDataStore bindings
// but are not actively called in the current architecture.

import { SeedService } from '../seed-templates'
import type { Folder, Notebook, Note, OptimisticUpdate } from './types'

export interface DataManagerState {
  optimisticUpdates: OptimisticUpdate<Folder | Notebook | Note>[]
  initialized: boolean
}

class DataManager {
  private static instance: DataManager

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager()
    }
    return DataManager.instance
  }

  isInitialized() {
    return false
  }

  async initialize(): Promise<void> {}
  async refresh(): Promise<void> {}
  async cleanup(): Promise<void> {}

  async createFolder(_data: Partial<Folder>): Promise<Folder> {
    throw new Error('Use React Query hooks instead')
  }
  async updateFolder(_id: string, _updates: Partial<Folder>): Promise<Folder> {
    throw new Error('Use React Query hooks instead')
  }
  async deleteFolder(_id: string): Promise<void> {
    throw new Error('Use React Query hooks instead')
  }

  async createNotebook(_data: Partial<Notebook>): Promise<Notebook> {
    throw new Error('Use React Query hooks instead')
  }
  async updateNotebook(_id: string, _updates: Partial<Notebook>): Promise<Notebook> {
    throw new Error('Use React Query hooks instead')
  }
  async deleteNotebook(_id: string): Promise<void> {
    throw new Error('Use React Query hooks instead')
  }

  async createNote(_data: Partial<Note>): Promise<Note> {
    throw new Error('Use React Query hooks instead')
  }
  async updateNote(_id: string, _updates: Partial<Note>): Promise<Note> {
    throw new Error('Use React Query hooks instead')
  }
  async deleteNote(_id: string): Promise<void> {
    throw new Error('Use React Query hooks instead')
  }
  async loadNotesForNotebook(_notebookId: string): Promise<Note[]> {
    throw new Error('Use React Query hooks instead')
  }

  async seedInitialData(templateId?: string): Promise<{ success: boolean; error?: string }> {
    const seedService = new SeedService()
    const hasData = await seedService.checkIfUserHasData()
    if (hasData) {
      return { success: false, error: 'User already has data.' }
    }
    return seedService.seedUserData({ userId: '', templateId })
  }
}

export const dataManager = DataManager.getInstance()
