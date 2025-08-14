import { createClient } from '@/lib/supabase/client'
import { dataStore } from './data-store'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Folder, Notebook, Note } from './types'

type DatabaseEntity = Folder | Notebook | Note

interface ChangePayload {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: DatabaseEntity | null
  old: DatabaseEntity | null
  commit_timestamp?: string
  errors?: string[] | null
  schema?: string
}

export class RealtimeManager {
  private channel: RealtimeChannel | null = null
  private userId: string | null = null
  private isConnected: boolean = false
  private isInitializing: boolean = false
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5

  private static instance: RealtimeManager

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager()
    }
    return RealtimeManager.instance
  }

  private constructor() {}

  async initialize(userId: string): Promise<void> {
    // Check if already connected or currently initializing
    if ((this.isConnected || this.isInitializing) && this.userId === userId) {
      console.log('[RealtimeManager] Already connected or initializing for user:', userId)
      return
    }

    this.isInitializing = true

    this.userId = userId
    console.log('[RealtimeManager] Initializing for user:', userId)

    const supabase = createClient()
    if (!supabase) {
      console.error('[RealtimeManager] Supabase client not available')
      return
    }

    // Clean up existing channel if any
    if (this.channel) {
      await this.disconnect()
    }

    // Get list of shared folder IDs to subscribe to
    const { data: sharedResources } = await supabase
      .from('permissions')
      .select('resource_id, resource_type')
      .eq('user_id', userId)

    const sharedFolderIds =
      sharedResources?.filter((r) => r.resource_type === 'folder')?.map((r) => r.resource_id) || []

    console.log('[RealtimeManager] Subscribing to shared folders:', sharedFolderIds)

    // Create channel for user's data
    this.channel = supabase
      .channel(`user-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => this.handleChange('folders', payload as ChangePayload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notebooks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => this.handleChange('notebooks', payload as ChangePayload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => this.handleChange('notes', payload as ChangePayload)
      )

    // Subscribe to shared folders
    sharedFolderIds.forEach((folderId) => {
      this.channel = this.channel!.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `id=eq.${folderId}`,
        },
        (payload) => this.handleChange('folders', payload as ChangePayload)
      )
      // Also subscribe to notebooks in shared folders
      this.channel = this.channel!.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notebooks',
          filter: `folder_id=eq.${folderId}`,
        },
        (payload) => this.handleChange('notebooks', payload as ChangePayload)
      )
    })

    // Now subscribe to the channel
    this.channel.subscribe((status) => {
      console.log('[RealtimeManager] Channel status:', status)

      if (status === 'SUBSCRIBED') {
        this.isConnected = true
        this.isInitializing = false
        this.reconnectAttempts = 0
        dataStore.getState().setRealtimeStatus('connected')
        console.log('[RealtimeManager] Successfully connected to realtime')
      } else if (status === 'CHANNEL_ERROR') {
        this.isConnected = false
        this.isInitializing = false
        dataStore.getState().setRealtimeStatus('error')
        this.handleReconnect()
      } else if (status === 'TIMED_OUT') {
        this.isConnected = false
        this.isInitializing = false
        dataStore.getState().setRealtimeStatus('disconnected')
        this.handleReconnect()
      } else if (status === 'CLOSED') {
        this.isConnected = false
        this.isInitializing = false
        dataStore.getState().setRealtimeStatus('disconnected')
      }
    })
  }

  private handleChange(table: string, payload: ChangePayload): void {
    const { eventType, new: newRecord, old: oldRecord } = payload

    console.log(`[RealtimeManager] Change detected in ${table}:`, {
      eventType,
      id: newRecord?.id || oldRecord?.id,
      newRecord,
      oldRecord,
    })

    // Check if this change originated from this client
    // We'll implement this check in Day 3-4 with optimistic updates
    // For now, apply all changes

    switch (table) {
      case 'folders':
        this.handleFolderChange(eventType, newRecord as Folder, oldRecord as Folder)
        break
      case 'notebooks':
        this.handleNotebookChange(eventType, newRecord as Notebook, oldRecord as Notebook)
        break
      case 'notes':
        this.handleNoteChange(eventType, newRecord as Note, oldRecord as Note)
        break
    }

    // Update sync timestamp
    dataStore.getState().setSyncTime(new Date())
  }

  private handleFolderChange(
    eventType: string,
    newRecord: Folder | null,
    oldRecord: Folder | null
  ): void {
    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          console.log('[RealtimeManager] Adding new folder:', newRecord.id)
          console.log(
            '[RealtimeManager] Before add - folder count:',
            dataStore.getState().entities.folders.length
          )
          dataStore.getState().addFolder(newRecord)
          console.log(
            '[RealtimeManager] After add - folder count:',
            dataStore.getState().entities.folders.length
          )
          console.log(
            '[RealtimeManager] Folder exists in store?',
            dataStore.getState().entities.folders.some((f) => f.id === newRecord.id)
          )
        }
        break

      case 'UPDATE':
        if (newRecord) {
          console.log('[RealtimeManager] Updating folder:', newRecord.id)
          dataStore.getState().updateFolder(newRecord.id, newRecord)
        }
        break

      case 'DELETE':
        if (oldRecord) {
          console.log('[RealtimeManager] Deleting folder:', oldRecord.id)
          dataStore.getState().removeFolder(oldRecord.id)
        }
        break
    }
  }

  private handleNotebookChange(
    eventType: string,
    newRecord: Notebook | null,
    oldRecord: Notebook | null
  ): void {
    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          console.log('[RealtimeManager] Adding new notebook:', newRecord.id)
          dataStore.getState().addNotebook(newRecord)
        }
        break

      case 'UPDATE':
        if (newRecord) {
          console.log('[RealtimeManager] Updating notebook:', newRecord.id)
          dataStore.getState().updateNotebook(newRecord.id, newRecord)
        }
        break

      case 'DELETE':
        if (oldRecord) {
          console.log('[RealtimeManager] Deleting notebook:', oldRecord.id)
          dataStore.getState().removeNotebook(oldRecord.id)
        }
        break
    }
  }

  private handleNoteChange(
    eventType: string,
    newRecord: Note | null,
    oldRecord: Note | null
  ): void {
    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          console.log('[RealtimeManager] Adding new note:', newRecord.id)
          dataStore.getState().addNote(newRecord)
        }
        break

      case 'UPDATE':
        if (newRecord) {
          console.log('[RealtimeManager] Updating note:', newRecord.id)
          dataStore.getState().updateNote(newRecord.id, newRecord)
        }
        break

      case 'DELETE':
        if (oldRecord) {
          console.log('[RealtimeManager] Deleting note:', oldRecord.id)
          dataStore.getState().removeNote(oldRecord.id)
        }
        break
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealtimeManager] Max reconnection attempts reached')
      dataStore.getState().setRealtimeStatus('error')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000) // Exponential backoff

    console.log(`[RealtimeManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    dataStore.getState().setRealtimeStatus('reconnecting')

    setTimeout(async () => {
      if (this.userId) {
        await this.initialize(this.userId)
      }
    }, delay)
  }

  async disconnect(): Promise<void> {
    console.log('[RealtimeManager] Disconnecting...')

    if (this.channel) {
      const supabase = createClient()
      if (supabase) {
        await supabase.removeChannel(this.channel)
      }
      this.channel = null
    }

    this.isConnected = false
    this.isInitializing = false
    this.userId = null
    dataStore.getState().setRealtimeStatus('disconnected')
    console.log('[RealtimeManager] Disconnected')
  }

  isActive(): boolean {
    return this.isConnected
  }

  getStatus(): 'connected' | 'disconnected' | 'reconnecting' | 'error' {
    if (this.isConnected) return 'connected'
    if (this.reconnectAttempts > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
      return 'reconnecting'
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return 'error'
    return 'disconnected'
  }
}
