import { createClient } from '@/lib/supabase/client'
import type { Folder, Notebook, Note, Quiz, ResourcePermission } from './types'
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
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
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
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          // First, check which of the user's own folders have been shared with others
          if (ownFolders && ownFolders.length > 0) {
            const ownFolderIds = ownFolders.map((f) => f.id)
            const { data: outgoingShares } = await supabase
              .from('permissions')
              .select('resource_id')
              .eq('resource_type', 'folder')
              .in('resource_id', ownFolderIds)
              .neq('user_id', user.id) // Permissions for other users

            if (outgoingShares && outgoingShares.length > 0) {
              console.log('Found folders shared by me:', outgoingShares)
              const sharedByMeIds = new Set(outgoingShares.map((p) => p.resource_id))
              // Note: sharedByMe info available but not used in current UI
              console.log(
                'Folders shared by me:',
                allFolders.filter((f) => sharedByMeIds.has(f.id)).map((f) => f.name)
              )
            }
          }

          // Get folders shared with the user
          try {
            const { data: sharedPerms } = await supabase
              .from('permissions')
              .select('resource_id, permission_level')
              .eq('user_id', user.id)
              .eq('resource_type', 'folder')
              .neq('permission_level', 'none')

            if (sharedPerms && sharedPerms.length > 0) {
              const sharedFolderIds = sharedPerms.map((p: { resource_id: string }) => p.resource_id)
              const { data: sharedFolders } = await supabase
                .from('folders')
                .select('*')
                .in('id', sharedFolderIds)

              if (sharedFolders && sharedFolders.length > 0) {
                console.log('Loaded shared folders:', sharedFolders.length)
                // Mark these as shared and add permission info
                const sharedFoldersWithPerms = sharedFolders.map((f: Folder) => {
                  const perm = sharedPerms.find(
                    (p: { resource_id: string }) => p.resource_id === f.id
                  )
                  return {
                    ...f,
                    shared: true,
                    permission_level: perm?.permission_level || 'read',
                  }
                })
                allFolders = [...allFolders, ...sharedFoldersWithPerms]
              }
            }
          } catch (error) {
            console.error('Failed to fetch shared folders:', error)
            // Continue without shared resources rather than failing completely
          }
        }
      }

      logApiCall('folders', 'GET', { count: allFolders.length })
      return allFolders as Folder[]
    } catch (error) {
      // Only return empty array if Supabase client is not available (dev mode)
      if (
        error instanceof Error &&
        (error.message === 'Supabase client not available' || error.message === 'No active session')
      ) {
        logger.warn('Running without valid session - returning empty folders')
        return []
      }
      throw error // Re-throw to be handled by store
    }
  },

  async create(folder: Omit<Folder, 'id' | 'created_at' | 'updated_at'>) {
    try {
      logApiCall('folders', 'POST', folder)
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase.from('folders').insert(folder).select().single()

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

  async update(
    id: string,
    updates: Partial<Omit<Folder, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) {
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
    const { error } = await supabase.from('folders').delete().eq('id', id)

    if (error) throw error
  },
}

export const notebooksApi = {
  async getAll(includeArchived = false, includeShared = true) {
    try {
      const supabase = await getSupabaseClient()

      // Get user's own notebooks with note counts
      let query = supabase
        .from('notebooks')
        .select(
          `
          *,
          notes:notes(count)
        `
        )
        .order('created_at', { ascending: true })

      if (!includeArchived) {
        query = query.eq('archived', false)
      }

      const { data: ownNotebooks, error: ownError } = await query

      if (ownError) throw ownError

      // Transform the data to include note_count
      let allNotebooks = (ownNotebooks || []).map((notebook) => ({
        ...notebook,
        note_count: notebook.notes?.[0]?.count ?? 0,
        notes: undefined, // Remove the notes property
      }))

      // Get shared notebooks if requested
      if (includeShared) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          // First, check which of the user's own notebooks have been shared with others
          if (ownNotebooks && ownNotebooks.length > 0) {
            const ownNotebookIds = ownNotebooks.map((n) => n.id)
            const { data: outgoingShares } = await supabase
              .from('permissions')
              .select('resource_id')
              .eq('resource_type', 'notebook')
              .in('resource_id', ownNotebookIds)
              .neq('user_id', user.id) // Permissions for other users

            if (outgoingShares && outgoingShares.length > 0) {
              const sharedByMeIds = new Set(outgoingShares.map((p) => p.resource_id))
              allNotebooks = allNotebooks.map((n) => ({
                ...n,
                sharedByMe: sharedByMeIds.has(n.id),
              }))
            }
          }
          // Get shared notebooks
          try {
            // Get directly shared notebooks
            const { data: notebookPerms } = await supabase
              .from('permissions')
              .select('resource_id, permission_level')
              .eq('user_id', user.id)
              .eq('resource_type', 'notebook')
              .neq('permission_level', 'none')

            if (notebookPerms && notebookPerms.length > 0) {
              const sharedNotebookIds = notebookPerms.map(
                (p: { resource_id: string }) => p.resource_id
              )
              let nbQuery = supabase.from('notebooks').select('*').in('id', sharedNotebookIds)

              if (!includeArchived) {
                nbQuery = nbQuery.eq('archived', false)
              }

              const { data: sharedNotebooks } = await nbQuery

              if (sharedNotebooks && sharedNotebooks.length > 0) {
                console.log('Loaded shared notebooks:', sharedNotebooks.length)
                // Mark these as directly shared and add permission info
                const sharedNotebooksWithPerms = sharedNotebooks.map((n: Notebook) => {
                  const perm = notebookPerms.find(
                    (p: { resource_id: string }) => p.resource_id === n.id
                  )
                  return {
                    ...n,
                    note_count: 0, // Will be populated later if needed
                    notes: undefined, // Notes loaded separately
                    shared: true,
                    sharedDirectly: true,
                    permission_level: perm?.permission_level || 'read',
                  }
                })
                allNotebooks = [...allNotebooks, ...sharedNotebooksWithPerms]
              }
            }

            // Also get notebooks from shared folders
            const { data: folderPerms } = await supabase
              .from('permissions')
              .select('resource_id, permission_level')
              .eq('user_id', user.id)
              .eq('resource_type', 'folder')
              .neq('permission_level', 'none')

            if (folderPerms && folderPerms.length > 0) {
              const sharedFolderIds = folderPerms.map((p: { resource_id: string }) => p.resource_id)
              let folderQuery = supabase
                .from('notebooks')
                .select('*')
                .in('folder_id', sharedFolderIds)

              if (!includeArchived) {
                folderQuery = folderQuery.eq('archived', false)
              }

              const { data: notebooksInSharedFolders } = await folderQuery

              if (notebooksInSharedFolders) {
                // Mark these as shared via folder (not directly)
                const markedNotebooks = notebooksInSharedFolders.map((n: Notebook) => {
                  const folderPerm = folderPerms.find(
                    (p: { resource_id: string }) => p.resource_id === n.folder_id
                  )
                  return {
                    ...n,
                    note_count: 0, // Will be populated later if needed
                    notes: undefined, // Notes loaded separately
                    shared: true,
                    sharedDirectly: false,
                    permission_level: folderPerm?.permission_level || 'read',
                  }
                })
                allNotebooks = [...allNotebooks, ...markedNotebooks]
              }
            }
          } catch (error) {
            console.error('Failed to fetch shared notebooks:', error)
            // Continue without shared resources rather than failing completely
          }
        }
      }

      return allNotebooks as Notebook[]
    } catch (error) {
      console.warn('Failed to fetch notebooks:', error)
      return []
    }
  },

  async create(
    notebook: Omit<Notebook, 'id' | 'created_at' | 'updated_at' | 'archived' | 'archived_at'>
  ) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('notebooks')
      .insert({ ...notebook, archived: false, archived_at: null })
      .select()
      .single()

    if (error) throw error
    // New notebooks have 0 notes
    return { ...data, note_count: 0 } as Notebook
  },

  async update(
    id: string,
    updates: Partial<Omit<Notebook, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>
  ) {
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
    const { error } = await supabase.from('notebooks').delete().eq('id', id)

    if (error) throw error
  },
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

  async create(note: Omit<Note, 'id' | 'owner_id' | 'created_by' | 'created_at' | 'updated_at'>) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase.from('notes').insert(note).select().single()

    if (error) throw error
    return data as Note
  },

  async update(
    id: string,
    updates: Partial<Omit<Note, 'id' | 'owner_id' | 'created_by' | 'created_at' | 'updated_at'>>
  ) {
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
    const { error } = await supabase.from('notes').delete().eq('id', id)

    if (error) throw error
  },
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
    const { data, error } = await supabase.from('quizzes').insert(quiz).select().single()

    if (error) throw error
    return data as Quiz
  },

  async update(
    id: string,
    updates: Partial<Omit<Quiz, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) {
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
    const { error } = await supabase.from('quizzes').delete().eq('id', id)

    if (error) throw error
  },
}

export const sharesApi = {
  async getShareMetadata() {
    try {
      const supabase = await getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      // Get all permissions for the user
      const { data: permissions, error: permError } = await supabase
        .from('permissions')
        .select('*')
        .or(`user_id.eq.${user.id},granted_by.eq.${user.id}`)

      if (permError) throw permError

      // Skip loading invitations for now - not used in the UI
      // and causes RLS errors on initial load
      // const { data: invitations, error: invError } = await supabase
      //   .from('invitations')
      //   .select('*')
      //   .eq('invited_by', user.id)
      // if (invError) throw invError

      return {
        permissions: permissions as ResourcePermission[],
        invitations: [] as never[], // Type as never[] since we're not loading invitations
      }
    } catch {
      // Silently fail - sharing metadata is optional
      return {
        permissions: [],
        invitations: [],
      }
    }
  },
}
