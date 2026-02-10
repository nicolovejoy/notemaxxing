'use client'

import { useEffect } from 'react'
import { usePermissionSync } from '@/lib/hooks/usePermissionSync'

export function PermissionSyncProvider({ children }: { children: React.ReactNode }) {
  // This hook sets up the permission change listener
  usePermissionSync()

  useEffect(() => {
    console.log('[PermissionSyncProvider] Component mounted')
  }, [])

  return <>{children}</>
}
