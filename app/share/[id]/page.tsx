'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { sharingApi } from '@/lib/api/sharing'
import { Button } from '@/components/ui'
import { Check, AlertCircle } from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import { apiFetch } from '@/lib/firebase/api-fetch'
import { queryClient } from '@/lib/query/query-client'

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const invitationId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invitationDetails, setInvitationDetails] = useState<{
    resourceType: 'folder' | 'notebook'
    resourceId: string
    resourceName: string
    permission: string
    invitedBy: string
    invitedEmail: string
    expiresAt: string
  } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [emailMismatch] = useState(false)

  useEffect(() => {
    const checkAuthAndLoadInvitation = async () => {
      try {
        const user = auth.currentUser

        setIsAuthenticated(!!user)

        if (user?.email) {
          setCurrentUserEmail(user.email)
        }

        // Load invitation preview (works for unauthenticated users)
        const response = await apiFetch(`/api/shares/invitation-preview/${invitationId}`)
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Invalid invitation')
        }

        const previewData = await response.json()

        if (!previewData.valid) {
          throw new Error(previewData.error || 'Invalid invitation')
        }

        // Map preview data to invitation details format
        setInvitationDetails({
          resourceType: previewData.resourceType,
          resourceId: '', // Don't expose internal IDs
          resourceName: previewData.resourceName,
          permission: 'read', // Don't expose permission level in preview
          invitedBy: previewData.invitedBy,
          invitedEmail: '', // Email not exposed in public preview for security
          expiresAt: previewData.expiresAt,
        })

        // Note: We can't check email mismatch from preview alone (security feature)
        // The actual email check will happen when accepting the invitation
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadInvitation()
  }, [invitationId])

  const handleAcceptInvitation = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/auth/login?redirectTo=/share/${invitationId}`)
      return
    }

    // Early return if no invitation details
    if (!invitationDetails) {
      setError('Invitation details not loaded')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await sharingApi.acceptInvitation(invitationId)
      setSuccess(true)

      // Invalidate folders cache so shared folder appears immediately
      queryClient.invalidateQueries({ queryKey: ['folders-view'] })

      // Redirect to the appropriate page after accepting
      setTimeout(() => {
        if (invitationDetails.resourceType === 'folder') {
          router.push('/backpack')
        } else {
          // Use the resource ID from the accept response if available
          const resourceId = result.permission?.resourceId || invitationDetails.resourceId
          if (resourceId) {
            router.push(`/notebooks/${resourceId}`)
          } else {
            router.push('/notebooks')
          }
        }
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !invitationDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invitationDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2 text-black">Invalid Invitation</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <Button onClick={() => router.push('/')}>Go to Homepage</Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Invitation Accepted!</h1>
          <p className="text-gray-600">Redirecting you to your new shared content...</p>
        </div>
      </div>
    )
  }

  // Show email mismatch error
  if (emailMismatch && invitationDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-4 text-center">Wrong Account</h1>

          <div className="mb-6 space-y-3">
            <p className="text-gray-600 text-center">
              This invitation is for{' '}
              <span className="font-medium">{invitationDetails.invitedEmail}</span>
            </p>
            <p className="text-gray-600 text-center">
              You are currently signed in as <span className="font-medium">{currentUserEmail}</span>
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                router.push(`/auth/login?redirectTo=/share/${invitationId}`)
              }}
              className="w-full"
            >
              Sign in with Different Account
            </Button>

            <Button variant="secondary" onClick={() => router.push('/')} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-semibold mb-4">
          You&apos;ve been invited to access a {invitationDetails?.resourceType}
        </h1>

        {invitationDetails && (
          <div className="mb-6 space-y-2">
            <p className="text-gray-600">
              <span className="font-medium">Shared by:</span> {invitationDetails.invitedBy}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Resource:</span> {invitationDetails.resourceName}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Permission:</span>{' '}
              {invitationDetails.permission === 'write' ? 'Can edit' : 'Can view'}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        {!isAuthenticated ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">To accept this invitation, you need to:</p>
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                <li>Create an account or sign in</li>
                <li>Verify your email address if needed</li>
                <li>Return to this link to accept the invitation</li>
              </ol>
            </div>

            <Button
              onClick={() => router.push(`/auth/signup?redirectTo=/share/${invitationId}`)}
              className="w-full"
            >
              Create Account
            </Button>

            <Button
              onClick={() => router.push(`/auth/login?redirectTo=/share/${invitationId}`)}
              variant="secondary"
              className="w-full"
            >
              I Already Have an Account
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleAcceptInvitation}
              disabled={loading || !invitationDetails || emailMismatch}
              className="w-full"
            >
              {loading ? 'Processing...' : 'Accept Invitation'}
            </Button>

            <Button variant="secondary" onClick={() => router.push('/')} className="w-full">
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
