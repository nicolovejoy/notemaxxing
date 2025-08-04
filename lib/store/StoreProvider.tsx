'use client'

import { useEffect, useState, useRef } from 'react'
import { dataManager } from './data-manager'
import { logger } from '@/lib/debug/logger'
import { createClient } from '@/lib/supabase/client'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const initializationAttempts = useRef(0)
  const maxRetries = 3
  
  useEffect(() => {
    setIsClient(true)
    logger.debug('StoreProvider mounted on client')
  }, [])
  
  useEffect(() => {
    if (!isClient) return
    
    const supabase = createClient()
    if (!supabase) {
      logger.warn('Supabase client not available')
      return
    }
    
    // Function to attempt store initialization
    const attemptInitialization = async () => {
      if (hasInitialized) {
        logger.debug('Store already initialized, skipping')
        return
      }
      
      try {
        // Check current auth state
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          logger.info(`Attempting store initialization (attempt ${initializationAttempts.current + 1}/${maxRetries})`)
          await dataManager.initialize()
          setHasInitialized(true)
          initializationAttempts.current = 0
          logger.info('Store initialized successfully via auth listener')
        } else {
          logger.debug('No session found, waiting for auth')
        }
      } catch (error) {
        initializationAttempts.current++
        logger.error(`Store initialization failed (attempt ${initializationAttempts.current}/${maxRetries})`, error)
        
        // Retry with exponential backoff
        if (initializationAttempts.current < maxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, initializationAttempts.current - 1), 5000)
          logger.info(`Retrying initialization in ${retryDelay}ms`)
          setTimeout(attemptInitialization, retryDelay)
        } else {
          logger.error('Max initialization attempts reached')
        }
      }
    }
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info(`Auth state changed: ${event}`)
      
      if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        // Add a small delay to ensure cookies are set
        setTimeout(() => {
          attemptInitialization()
        }, 100)
      } else if (event === 'SIGNED_OUT') {
        setHasInitialized(false)
        initializationAttempts.current = 0
        // TODO: Add clearAll method to dataManager if needed
      }
    })
    
    // Initial attempt
    attemptInitialization()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [isClient, hasInitialized])
  
  // Don't render children until client-side to avoid hydration mismatch
  if (!isClient) {
    return null
  }
  
  return <>{children}</>
}