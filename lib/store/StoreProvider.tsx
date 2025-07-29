'use client'

import { useEffect } from 'react'
import { useInitializeStore } from './hooks'
import { createClient } from '@/lib/supabase/client'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initializeStore = useInitializeStore()
  
  useEffect(() => {
    // Check if user is authenticated before initializing store
    const checkUserAndInit = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // User is authenticated, initialize the store
        await initializeStore()
      }
    }
    
    checkUserAndInit()
    
    // Listen for auth state changes
    const supabase = createClient()
    // @ts-expect-error - Supabase auth callbacks have complex types that TypeScript struggles with
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // User just signed in, initialize the store
        await initializeStore()
      } else if (event === 'SIGNED_OUT') {
        // User signed out, clear the store
        // The store will be cleared automatically when the page reloads
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [initializeStore])
  
  return <>{children}</>
}