'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Users, Trash2, Check, AlertCircle, Copy } from 'lucide-react'
import { Modal, Button } from './ui'
import { sharingApi } from '@/lib/api/sharing'
import type { ResourceType, Permission, SharedResource } from '@/lib/types/sharing'

interface ShareDialogProps {
  resourceId: string
  resourceType: ResourceType
  resourceName: string
  onClose: () => void
}

export function ShareDialog({
  resourceId,
  resourceType,
  resourceName,
  onClose
}: ShareDialogProps) {
  const [permission, setPermission] = useState<Permission>('read')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sharedWith, setSharedWith] = useState<SharedResource[]>([])
  const [loadingShares, setLoadingShares] = useState(true)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Load shares function
  const loadShares = useCallback(async () => {
    try {
      setLoadingShares(true)
      const shares = await sharingApi.listShares()
      
      // Filter to only show shares for this resource
      const relevantShares = shares.sharedByMe.filter(
        share => share.resourceId === resourceId && share.resourceType === resourceType
      )
      
      setSharedWith(relevantShares)
    } catch (err) {
      console.error('Failed to load shares:', err)
    } finally {
      setLoadingShares(false)
    }
  }, [resourceId, resourceType])

  // Load current shares
  useEffect(() => {
    loadShares()
  }, [loadShares])


  const handleGenerateLink = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await sharingApi.generateShareLink({
        resourceType,
        resourceId,
        permission
      })

      const link = `${window.location.origin}/share/${response.invitationId}`
      setShareLink(link)
      setSuccess('Share link generated!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share link')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareLink) return
    
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy link to clipboard')
    }
  }

  const handleRevoke = async (permissionId: string) => {
    if (!confirm('Are you sure you want to revoke this permission?')) {
      return
    }

    try {
      await sharingApi.revokePermission(permissionId)
      loadShares()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to revoke permission')
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Share {resourceName}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Share form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission level
            </label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as Permission)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              disabled={loading || !!shareLink}
            >
              <option value="read">Can view</option>
              <option value="write">Can edit</option>
            </select>
          </div>

          {!shareLink ? (
            <Button
              onClick={handleGenerateLink}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate Share Link'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                  />
                  <Button
                    onClick={handleCopyLink}
                    size="sm"
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Anyone with this link can access this {resourceType}
                </p>
              </div>
              <Button
                onClick={() => {
                  setShareLink(null)
                  setPermission('read')
                }}
                variant="secondary"
                className="w-full"
              >
                Generate New Link
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="h-4 w-4" />
              {success}
            </div>
          )}
        </div>

        {/* Current shares */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            People with access
          </h3>

          {loadingShares ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : sharedWith.length === 0 ? (
            <div className="text-gray-500 text-sm">
              Not shared with anyone yet
            </div>
          ) : (
            <div className="space-y-2">
              {sharedWith.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {share.user?.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {share.permission === 'write' ? 'Can edit' : 'Can view'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(share.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Revoke access"
                  >
                    <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}