import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Helper to get authenticated Supabase client for API routes
 * Handles null checks and authentication validation
 * Returns standardized error responses
 */
export async function getAuthenticatedSupabaseClient() {
  const supabase = await createClient()

  if (!supabase) {
    return {
      client: null,
      error: NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 }),
    }
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      client: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { client: supabase, user, error: null }
}

/**
 * Helper to get Supabase client for public API routes (no auth required)
 * Handles null checks
 */
export async function getPublicSupabaseClient() {
  const supabase = await createClient()

  if (!supabase) {
    return {
      client: null,
      error: NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 }),
    }
  }

  return { client: supabase, error: null }
}
