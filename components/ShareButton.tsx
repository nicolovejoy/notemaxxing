'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { IconButton } from './ui'
import { ShareDialog } from './ShareDialog'
import type { ResourceType } from '@/lib/types/sharing'

interface ShareButtonProps {
  resourceId: string
  resourceType: ResourceType
  resourceName: string
  className?: string
}

export function ShareButton({ 
  resourceId, 
  resourceType, 
  resourceName,
  className 
}: ShareButtonProps) {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <>
      <IconButton
        icon={Share2}
        onClick={(e) => {
          e.stopPropagation()
          setShowDialog(true)
        }}
        className={className}
        title={`Share ${resourceType}`}
      />

      {showDialog && (
        <ShareDialog
          resourceId={resourceId}
          resourceType={resourceType}
          resourceName={resourceName}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  )
}