export interface Folder {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export interface Notebook {
  id: string
  user_id: string
  folder_id: string
  name: string
  color: string
  archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  user_id: string
  notebook_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface QuizQuestion {
  question: string
  answer: string
  options?: string[]
  explanation?: string
}

export interface Quiz {
  id: string
  user_id: string
  subject: string
  questions: QuizQuestion[]
  created_at: string
  updated_at: string
}

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error'

export interface SyncState {
  status: SyncStatus
  error: string | null
  lastSyncTime: Date | null
}

export interface OptimisticUpdate<T> {
  id: string
  type: 'create' | 'update' | 'delete'
  data: T
  timestamp: number
}