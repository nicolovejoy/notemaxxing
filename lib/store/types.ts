// Database types
import type { Database } from '../supabase/database.types'

// Entity types
export type Folder = Database['public']['Tables']['folders']['Row'] & {
  shared?: boolean
  sharedByMe?: boolean
  permission?: 'read' | 'write'
  virtual?: boolean // Folder only visible due to shared notebook
  sharedNotebookOnly?: boolean // True when folder is shown because it contains shared notebooks
}
export type Notebook = Database['public']['Tables']['notebooks']['Row'] & {
  shared?: boolean
  sharedByMe?: boolean
  permission?: 'read' | 'write'
}
export type Note = Database['public']['Tables']['notes']['Row']
export type Quiz = Database['public']['Tables']['quizzes']['Row'] & {
  questions: QuizQuestion[]
}

// Quiz types
export interface QuizQuestion {
  id: string
  question: string
  answer: string
  options?: string[]
  type: 'multiple-choice' | 'short-answer' | 'essay'
}

// Sharing types
export type { Permission, ResourceType, ShareInvitation, ResourcePermission } from '../types/sharing'

// Store types
export interface SyncState {
  status: 'idle' | 'loading' | 'error'
  error: string | null
  lastSyncTime: Date | null
}

export interface OptimisticUpdate<T> {
  id: string
  type: 'create' | 'update' | 'delete'
  data: T
  timestamp: number
}