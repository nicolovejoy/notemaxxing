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

export interface OfflineQueueItem {
  id: string
  action: 'create' | 'update' | 'delete'
  entity: 'folder' | 'notebook' | 'note' | 'quiz'
  data: unknown
  timestamp: number
  retryCount: number
}
