// Entity types
export type { Folder, Notebook, Note, Quiz, QuizQuestion } from '../types/entities'

// Sharing types
export type {
  Permission,
  ResourceType,
  ShareInvitation,
  ResourcePermission,
} from '../types/sharing'

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
