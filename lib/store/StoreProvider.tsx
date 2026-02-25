'use client'

import { useState, useEffect } from 'react'

// StoreProvider now just handles client-side rendering guard.
// Auth state is managed by useAuth() and data by React Query.
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return <>{children}</>
}
