'use client'

import { useEffect } from 'react'
import { useInitializeStore } from './hooks'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initializeStore = useInitializeStore()
  
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null
    
    const setupAuth = async () => {
      try {
        const supabase = createClient()
        if (!supabase) {
          console.warn('Supabase client not available')
          return
        }
        
        // Check current user
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await initializeStore()
        }
        
        // Listen for auth changes
        const { data } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
          if (event === 'SIGNED_IN' && session?.user) {
            await initializeStore()
          }
        })
        
        subscription = data?.subscription
      } catch (error) {
        console.error('Error setting up auth:', error)
      }
    }
    
    setupAuth()
    
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [initializeStore])
  
  return <>{children}</>
}