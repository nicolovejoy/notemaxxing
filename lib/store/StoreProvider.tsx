'use client'

import { useEffect, useState } from 'react'
import { useInitializeStore } from './hooks'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  const initializeStore = useInitializeStore()
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  useEffect(() => {
    if (!isClient) return
    
    // Always initialize - middleware ensures only auth'd users reach protected pages
    initializeStore().catch((error) => {
      console.error('Store initialization failed:', error)
    })
  }, [isClient, initializeStore])
  
  // Don't render children until client-side to avoid hydration mismatch
  if (!isClient) {
    return null
  }
  
  return <>{children}</>
}