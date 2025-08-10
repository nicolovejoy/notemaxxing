'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Trash2, Check, Copy, Link } from 'lucide-react'
import { Modal, Button, IconButton } from './ui'
import { sharingApi } from '@/lib/api/sharing'
import { createClient } from '@/lib/supabase/client'
import { FormField } from '@/components/ui/FormField'
import { SelectField } from '@/components/ui/SelectField'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { LoadingButton } from '@/components/ui/LoadingButton'
import type { ResourceType, Permission, SharedResource } from '@/lib/types/sharing'

interface ShareDialogProps {
  resourceId: string
  resourceType: ResourceType
  resourceName: string
  onClose: () => void
}

export function ShareDialog({ resourceId, resourceType, resourceName, onClose }: ShareDialogProps) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<Permission>('read')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sharedWith, setSharedWith] = useState<SharedResource[]>([])
  const [loadingShares, setLoadingShares] = useState(true)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [invitationLink, setInvitationLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedText, setCopiedText] = useState(false)

  // Load shares function
  const loadShares = useCallback(async () => {
    try {
      setLoadingShares(true)
      const shares = await sharingApi.listShares()

      // Filter to only show shares for this resource
      const relevantShares = shares.sharedByMe.filter(
        (share) => share.resourceId === resourceId && share.resourceType === resourceType
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

  // Get current user email
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient()
      if (!supabase) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email) {
        setCurrentUserEmail(user.email)
      }
    }
    getCurrentUser()
  }, [])

  const handleSendInvitation = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await sharingApi.generateShareLink({
        resourceType,
        resourceId,
        permission,
        email,
      })

      const link = `${window.location.origin}/share/${response.invitationId}`
      setInvitationLink(link)
      setSuccess('Invitation link generated!')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!invitationLink) return

    try {
      await navigator.clipboard.writeText(invitationLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy link')
    }
  }

  const handleCopyInvitationText = async () => {
    if (!invitationLink || !email) return

    const invitationText = `I'm inviting you to share the ${resourceType} called "${resourceName}". Click this link to accept: ${invitationLink}`

    try {
      await navigator.clipboard.writeText(invitationText)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      setError('Failed to copy invitation text')
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
    <Modal isOpen={true} onClose={onClose} title={`Share ${resourceName}`} size="md">
      <div className="space-y-6">
        {/* Share form */}
        <div className="space-y-4">
          {!invitationLink ? (
            <>
              <FormField
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                disabled={loading}
                error={
                  email &&
                  currentUserEmail &&
                  email.toLowerCase() === currentUserEmail.toLowerCase()
                    ? 'You cannot share with yourself'
                    : undefined
                }
              />

              <SelectField
                label="Permission level"
                value={permission}
                onChange={(value) => setPermission(value as Permission)}
                options={[
                  { value: 'read', label: 'Can view' },
                  { value: 'write', label: 'Can edit' },
                ]}
                disabled={loading}
              />

              <LoadingButton
                onClick={handleSendInvitation}
                disabled={
                  !email ||
                  !!(
                    email &&
                    currentUserEmail &&
                    email.toLowerCase() === currentUserEmail.toLowerCase()
                  )
                }
                loading={loading}
                loadingText="Generating..."
                fullWidth
                variant="primary"
              >
                Generate Invitation Link
              </LoadingButton>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Invitation for {email}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Send this link to {email}. The invitation expires in 7 days.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Share link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={invitationLink}
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
                            <Link className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleCopyInvitationText}
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {copiedText ? (
                      <>
                        <Check className="h-4 w-4" />
                        Invitation Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Invitation Text
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => {
                  setInvitationLink(null)
                  setEmail('')
                  setPermission('read')
                  loadShares()
                }}
                variant="secondary"
                className="w-full"
              >
                Create Another Invitation
              </Button>
            </div>
          )}

          {error && <StatusMessage type="error" message={error} />}
          {success && <StatusMessage type="success" message={success} />}
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
            <div className="text-gray-500 text-sm">Not shared with anyone yet</div>
          ) : (
            <div className="space-y-2">
              {sharedWith.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{share.user?.email}</div>
                    <div className="text-xs text-gray-500">
                      {share.permission === 'write' ? 'Can edit' : 'Can view'}
                    </div>
                  </div>
                  <IconButton
                    icon={Trash2}
                    onClick={() => handleRevoke(share.id)}
                    size="sm"
                    variant="danger"
                    title="Revoke access"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
