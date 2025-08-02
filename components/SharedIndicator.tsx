'use client'

import { Users, Eye, Edit } from 'lucide-react'
import type { Permission } from '@/lib/types/sharing'

interface SharedIndicatorProps {
  shared?: boolean
  permission?: Permission
  className?: string
}

export function SharedIndicator({ shared, permission, className = '' }: SharedIndicatorProps) {
  if (!shared) return null

  const Icon = permission === 'write' ? Edit : Eye
  
  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs ${className}`}
      title={permission === 'write' ? 'Shared (can edit)' : 'Shared (view only)'}
    >
      <Users className="h-3 w-3" />
      <Icon className="h-3 w-3" />
    </div>
  )
}