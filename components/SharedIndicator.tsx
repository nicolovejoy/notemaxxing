'use client'

import { Eye, Edit, Share2 } from 'lucide-react'
import type { Permission } from '@/lib/types/sharing'

interface SharedIndicatorProps {
  shared?: boolean
  sharedByMe?: boolean
  permission?: Permission
  className?: string
  onClick?: () => void
}

export function SharedIndicator({
  shared,
  sharedByMe,
  permission,
  className = '',
  onClick,
}: SharedIndicatorProps) {
  // Show indicator for resources shared by the user
  if (sharedByMe) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-md text-xs ${className} ${
          onClick ? 'cursor-pointer hover:bg-green-100 transition-colors' : ''
        }`}
        title={onClick ? 'Click to manage sharing' : 'Shared by you'}
        onClick={onClick}
      >
        <Share2 className="h-3 w-3" />
        <span>Shared by you</span>
      </div>
    )
  }

  // Show indicator for resources shared with the user
  if (!shared) return null

  const Icon = permission === 'write' ? Edit : Eye

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs ${className}`}
      title={permission === 'write' ? 'Shared (can edit)' : 'Shared (view only)'}
    >
      <Icon className="h-3 w-3" />
      <span>{permission === 'write' ? 'Can edit' : 'View only'}</span>
    </div>
  )
}
