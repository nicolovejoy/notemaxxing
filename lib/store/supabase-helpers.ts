import { createClient } from '@/lib/supabase/client'
import type { Folder, Notebook, Note, Quiz } from './types'

const supabase = createClient()

export const foldersApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data as Folder[]
  },

  async create(folder: Omit<Folder, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('folders')
      .insert(folder)
      .select()
      .single()
    
    if (error) throw error
    return data as Folder
  },

  async update(id: string, updates: Partial<Omit<Folder, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
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
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const notebooksApi = {
  async getAll(includeArchived = false) {
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
  },

  async create(notebook: Omit<Notebook, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'archived' | 'archived_at'>) {
    const { data, error } = await supabase
      .from('notebooks')
      .insert({ ...notebook, archived: false, archived_at: null })
      .select()
      .single()
    
    if (error) throw error
    return data as Notebook
  },

  async update(id: string, updates: Partial<Omit<Notebook, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
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
    const { error } = await supabase
      .from('notebooks')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const notesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Note[]
  },

  async getByNotebook(notebookId: string) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Note[]
  },

  async create(note: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('notes')
      .insert(note)
      .select()
      .single()
    
    if (error) throw error
    return data as Note
  },

  async update(id: string, updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
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
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const quizzesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Quiz[]
  },

  async create(quiz: Omit<Quiz, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert(quiz)
      .select()
      .single()
    
    if (error) throw error
    return data as Quiz
  },

  async update(id: string, updates: Partial<Omit<Quiz, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
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
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}