import { createClient } from '@/lib/supabase/client'
import type { Folder, Notebook, Note, Quiz, ShareInvitation, ResourcePermission } from './types'
import { logger, logApiCall } from '@/lib/debug/logger'
import { handleSupabaseError } from './error-handler'

// Helper to get Supabase client with null check and session validation
async function getSupabaseClient() {
  const supabase = createClient()
  if (!supabase) {
    logger.error('Supabase client not available - check environment variables')
    throw new Error('Supabase client not available')
  }
  
  // Ensure we have a valid session before making API calls
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    logger.error('Failed to get session:', error)
    throw new Error(`Session error: ${error.message}`)
  }
  
  if (!session) {
    logger.warn('No active session when trying to make API call')
    throw new Error('No active session')
  }
  
  return supabase
}

export const foldersApi = {
  async getAll(includeShared = true) {
    try {
      logApiCall('folders', 'GET')
      const supabase = await getSupabaseClient()
      
      // Get user's own folders
      const { data: ownFolders, error: ownError } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (ownError) {
        logApiCall('folders', 'GET', null, ownError)
        handleSupabaseError(ownError, 'fetch own folders')
      }
      
      let allFolders = ownFolders || []
      
      // Get shared folders if requested
      if (includeShared) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: sharedFolderIds, error: permError } = await supabase
            .from('permissions')
            .select('resource_id, permission')
            .eq('resource_type', 'folder')
            .eq('user_id', user.id)
          
          if (!permError && sharedFolderIds && sharedFolderIds.length > 0) {
            console.log('[FoldersAPI] Found shared folder permissions:', { count: sharedFolderIds.length, permissions: sharedFolderIds })
            const folderIds = sharedFolderIds.map(p => p.resource_id)
            const { data: sharedFolders, error: sharedError } = await supabase
              .from('folders')
              .select('*')
              .in('id', folderIds)
              .order('created_at', { ascending: true })
            
            if (!sharedError && sharedFolders) {
              console.log('[FoldersAPI] Loaded shared folders:', { count: sharedFolders.length })
              // Mark shared folders
              const markedSharedFolders = sharedFolders.map(f => ({
                ...f,
                shared: true,
                permission: sharedFolderIds.find(p => p.resource_id === f.id)?.permission || 'read'
              }))
              allFolders = [...allFolders, ...markedSharedFolders]
            } else if (sharedError) {
              console.error('[FoldersAPI] Error loading shared folders:', sharedError)
            }
          }
        }
      }
      
      logApiCall('folders', 'GET', { count: allFolders.length })
      return allFolders as Folder[]
    } catch (error) {
      // Only return empty array if Supabase client is not available (dev mode)
      if (error instanceof Error && (error.message === 'Supabase client not available' || error.message === 'No active session')) {
        logger.warn('Running without valid session - returning empty folders')
        return []
      }
      throw error // Re-throw to be handled by store
    }
  },

  async create(folder: Omit<Folder, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    try {
      logApiCall('folders', 'POST', folder)
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('folders')
        .insert(folder)
        .select()
        .single()
      
      if (error) {
        logApiCall('folders', 'POST', folder, error)
        handleSupabaseError(error, 'create folder')
      }
      
      logApiCall('folders', 'POST', { created: data })
      return data as Folder
    } catch (error) {
      logger.error('Failed to create folder', { folder, error })
      throw error
    }
  },

  async update(id: string, updates: Partial<Omit<Folder, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Folder
  },

  async delete(id: string) {
    const supabase = await getSupabaseClient()
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const notebooksApi = {
  async getAll(includeArchived = false, includeShared = true) {
    try {
      const supabase = await getSupabaseClient()
      
      // Get user's own notebooks
      let query = supabase
        .from('notebooks')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (!includeArchived) {
        query = query.eq('archived', false)
      }
      
      const { data: ownNotebooks, error: ownError } = await query
      
      if (ownError) throw ownError
      
      let allNotebooks = ownNotebooks || []
      
      // Get shared notebooks if requested
      if (includeShared) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Get directly shared notebooks
          const { data: sharedNotebookPerms, error: notebookPermError } = await supabase
            .from('permissions')
            .select('resource_id, permission')
            .eq('resource_type', 'notebook')
            .eq('user_id', user.id)
          
          // Get notebooks in shared folders
          const { data: sharedFolderPerms, error: folderPermError } = await supabase
            .from('permissions')
            .select('resource_id, permission')
            .eq('resource_type', 'folder')
            .eq('user_id', user.id)
          
          const notebookIds: string[] = []
          const permissions: Record<string, string> = {}
          
          // Collect directly shared notebook IDs
          if (!notebookPermError && sharedNotebookPerms) {
            sharedNotebookPerms.forEach(p => {
              notebookIds.push(p.resource_id)
              permissions[p.resource_id] = p.permission
            })
          }
          
          // Get notebooks from shared folders
          if (!folderPermError && sharedFolderPerms && sharedFolderPerms.length > 0) {
            const folderIds = sharedFolderPerms.map(p => p.resource_id)
            let folderQuery = supabase
              .from('notebooks')
              .select('id, folder_id')
              .in('folder_id', folderIds)
            
            if (!includeArchived) {
              folderQuery = folderQuery.eq('archived', false)
            }
            
            const { data: notebooksInSharedFolders } = await folderQuery
            
            if (notebooksInSharedFolders) {
              notebooksInSharedFolders.forEach(n => {
                if (!notebookIds.includes(n.id)) {
                  notebookIds.push(n.id)
                  // Inherit folder permission
                  const folderPerm = sharedFolderPerms.find(
                    p => p.resource_id === n.folder_id
                  )
                  if (folderPerm) {
                    permissions[n.id] = folderPerm.permission
                  }
                }
              })
            }
          }
          
          // Fetch all shared notebooks
          if (notebookIds.length > 0) {
            const { data: sharedNotebooks, error: sharedError } = await supabase
              .from('notebooks')
              .select('*')
              .in('id', notebookIds)
              .order('created_at', { ascending: true })
            
            if (!sharedError && sharedNotebooks) {
              const markedSharedNotebooks = sharedNotebooks.map(n => ({
                ...n,
                shared: true,
                permission: permissions[n.id] || 'read'
              }))
              allNotebooks = [...allNotebooks, ...markedSharedNotebooks]
            }
          }
        }
      }
      
      return allNotebooks as Notebook[]
    } catch (error) {
      console.warn('Failed to fetch notebooks:', error)
      return []
    }
  },

  async create(notebook: Omit<Notebook, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'archived' | 'archived_at'>) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('notebooks')
      .insert({ ...notebook, archived: false, archived_at: null })
      .select()
      .single()
    
    if (error) throw error
    return data as Notebook
  },

  async update(id: string, updates: Partial<Omit<Notebook, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('notebooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Notebook
  },

  async archive(id: string) {
    return notebooksApi.update(id, { archived: true, archived_at: new Date().toISOString() })
  },

  async restore(id: string) {
    return notebooksApi.update(id, { archived: false, archived_at: null })
  },

  async delete(id: string) {
    const supabase = await getSupabaseClient()
    const { error } = await supabase
      .from('notebooks')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const notesApi = {
  async getAll() {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Note[]
    } catch (error) {
      console.warn('Failed to fetch notes:', error)
      return []
    }
  },

  async getByNotebook(notebookId: string) {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Note[]
    } catch (error) {
      console.warn('Failed to fetch notes by notebook:', error)
      return []
    }
  },

  async create(note: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('notes')
      .insert(note)
      .select()
      .single()
    
    if (error) throw error
    return data as Note
  },

  async update(id: string, updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Note
  },

  async delete(id: string) {
    const supabase = await getSupabaseClient()
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const quizzesApi = {
  async getAll() {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Quiz[]
    } catch (error) {
      console.warn('Failed to fetch quizzes:', error)
      return []
    }
  },

  async create(quiz: Omit<Quiz, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('quizzes')
      .insert(quiz)
      .select()
      .single()
    
    if (error) throw error
    return data as Quiz
  },

  async update(id: string, updates: Partial<Omit<Quiz, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Quiz
  },

  async delete(id: string) {
    const supabase = await getSupabaseClient()
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const sharesApi = {
  async getShareMetadata() {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')
      
      // Get all permissions for the user
      const { data: permissions, error: permError } = await supabase
        .from('permissions')
        .select('*')
        .or(`user_id.eq.${user.id},granted_by.eq.${user.id}`)
      
      if (permError) throw permError
      
      // Get share invitations created by the user
      const { data: invitations, error: invError } = await supabase
        .from('share_invitations')
        .select('*')
        .eq('invited_by', user.id)
      
      if (invError) throw invError
      
      return {
        permissions: permissions as ResourcePermission[],
        invitations: invitations as ShareInvitation[]
      }
    } catch {
      // Silently fail - sharing metadata is optional
      return {
        permissions: [],
        invitations: []
      }
    }
  }
}