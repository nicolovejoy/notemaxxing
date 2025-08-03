'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { sharingApi } from '@/lib/api/sharing'
import { Button } from '@/components/ui'
import { Check, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const invitationId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invitationDetails, setInvitationDetails] = useState<{
    resourceType: string
    resourceId: string
    resourceName: string
    permission: string
    invitedBy: string
    expiresAt: string
  } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuthAndLoadInvitation = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        setIsAuthenticated(!!user)

        // Load invitation details
        const response = await fetch(`/api/shares/invitation/${invitationId}`)
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Invalid invitation')
        }

        const data = await response.json()
        setInvitationDetails(data)
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
      router.push(`/auth/login?redirect=/share/${invitationId}`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await sharingApi.acceptInvitation(invitationId)
      setSuccess(true)

      // Redirect to the appropriate page after accepting
      setTimeout(() => {
        if (invitationDetails.resourceType === 'folder') {
          router.push('/folders')
        } else {
          router.push(`/notebooks/${invitationDetails.resourceId}`)
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/')}>
            Go to Homepage
          </Button>
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
              <span className="font-medium">Permission:</span> {invitationDetails.permission === 'write' ? 'Can edit' : 'Can view'}
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

        <div className="space-y-3">
          <Button 
            onClick={handleAcceptInvitation} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processing...' : (isAuthenticated ? 'Accept Invitation' : 'Sign in to Accept')}
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => router.push('/')}
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        {!isAuthenticated && (
          <p className="mt-4 text-sm text-gray-500 text-center">
            You&apos;ll need to sign in or create an account to accept this invitation
          </p>
        )}
      </div>
    </div>
  )
}