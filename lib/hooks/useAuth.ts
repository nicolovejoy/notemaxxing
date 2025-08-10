import { useEffect, useState, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  loading: boolean
  error: Error | null
}

/**
 * Client-side authentication hook that provides a memoized Supabase client
 * and manages auth state across the application.
 *
 * Benefits:
 * - Single source of truth for auth state
 * - Memoized client instance (prevents recreating on every render)
 * - Consistent error handling
 * - Loading states for better UX
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  // Memoize the Supabase client to prevent recreating it on every render
  const client = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!client) {
      setAuthState({
        user: null,
        loading: false,
        error: new Error('Supabase client not initialized'),
      })
      return
    }

    // Get initial session
    const initAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await client.auth.getUser()
        if (error) throw error

        setAuthState({
          user,
          loading: false,
          error: null,
        })
      } catch (error) {
        setAuthState({
          user: null,
          loading: false,
          error: error as Error,
        })
      }
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        user: session?.user ?? null,
        loading: false,
        error: null,
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [client])

  // Helper functions
  const signOut = async () => {
    if (!client) {
      setAuthState((prev) => ({
        ...prev,
        error: new Error('Supabase client not initialized'),
      }))
      return
    }

    try {
      const { error } = await client.auth.signOut()
      if (error) throw error
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        error: error as Error,
      }))
    }
  }

  const refreshSession = async () => {
    if (!client) {
      setAuthState((prev) => ({
        ...prev,
        error: new Error('Supabase client not initialized'),
      }))
      return
    }

    try {
      const {
        data: { session },
        error,
      } = await client.auth.refreshSession()
      if (error) throw error

      setAuthState({
        user: session?.user ?? null,
        loading: false,
        error: null,
      })
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        error: error as Error,
      }))
    }
  }

  return {
    ...authState,
    client,
    signOut,
    refreshSession,
    isAuthenticated: !!authState.user,
  }
}
