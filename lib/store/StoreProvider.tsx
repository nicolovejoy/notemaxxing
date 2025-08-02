'use client'

import { useEffect, useState } from 'react'
import { useInitializeStore } from './hooks'
import { logger } from '@/lib/debug/logger'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  const initializeStore = useInitializeStore()
  
  useEffect(() => {
    setIsClient(true)
    logger.debug('StoreProvider mounted on client')
  }, [])
  
  useEffect(() => {
    if (!isClient) return
    
    // Add a small delay to ensure auth state is ready after login redirect
    const initTimer = setTimeout(() => {
      logger.info('Initializing store...')
      initializeStore()
        .then(() => {
          logger.info('Store initialized successfully')
        })
        .catch((error) => {
          logger.error('Store initialization failed', error)
        })
    }, 100)
    
    return () => clearTimeout(initTimer)
  }, [isClient, initializeStore])
  
  // Don't render children until client-side to avoid hydration mismatch
  if (!isClient) {
    return null
  }
  
  return <>{children}</>
}