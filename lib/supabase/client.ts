import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance for client-side Supabase client
let clientInstance: SupabaseClient<Database> | null = null

/**
 * Creates or returns a memoized Supabase client for browser use.
 * This prevents creating multiple client instances which can cause
 * connection overhead and memory leaks.
 * 
 * @param forceNew - Force creation of a new client (useful for auth changes)
 */
export function createClient(forceNew = false) {
  // Check if env vars are set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('[Supabase] Environment variables not set - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return null
  }
  
  // Return existing instance if available and not forcing new
  if (clientInstance && !forceNew) {
    return clientInstance
  }
  
  // Create new instance
  clientInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  return clientInstance
}