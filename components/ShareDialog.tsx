'use client'

import { useState, useEffect } from 'react'
import { X, Mail, Users, Trash2, Check, AlertCircle } from 'lucide-react'
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
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<Permission>('read')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sharedWith, setSharedWith] = useState<SharedResource[]>([])
  const [loadingShares, setLoadingShares] = useState(true)

  // Load current shares
  useEffect(() => {
    loadShares()
  }, [resourceId])

  const loadShares = async () => {
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
  }

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Please enter an email address')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await sharingApi.sendInvitation({
        resourceType,
        resourceId,
        invitedEmail: email.trim(),
        permission
      })

      setSuccess(`Invitation sent to ${email}`)
      setEmail('')
      
      // Reload shares
      loadShares()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (permissionId: string) => {
    if (!confirm('Are you sure you want to revoke this permission?')) {
      return
    }

    try {
      await sharingApi.revokePermission(permissionId)
      loadShares()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke permission')
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
        <form onSubmit={handleShare} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email to share with"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission level
            </label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as Permission)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="read">Can view</option>
              <option value="write">Can edit</option>
            </select>
          </div>

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

          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Send invitation'}
          </Button>
        </form>

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