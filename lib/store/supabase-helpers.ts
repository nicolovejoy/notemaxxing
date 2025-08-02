import { createClient } from '@/lib/supabase/client'
import type { Folder, Notebook, Note, Quiz } from './types'
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
  async getAll() {
    try {
      logApiCall('folders', 'GET')
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (error) {
        logApiCall('folders', 'GET', null, error)
        handleSupabaseError(error, 'fetch folders')
      }
      
      logApiCall('folders', 'GET', { count: data?.length || 0 })
      return data as Folder[]
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
  async getAll(includeArchived = false) {
    try {
      const supabase = await getSupabaseClient()
      let query = supabase
        .from('notebooks')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (!includeArchived) {
        query = query.eq('archived', false)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as Notebook[]
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