'use client'

import { useState } from 'react'
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react'
import { Modal } from './ui/Modal'
import { LoadingButton } from './ui/LoadingButton'
import { FormField } from './ui/FormField'
import { StatusMessage } from './ui/StatusMessage'

interface AdminConsoleProps {
  onClose: () => void
}

export function AdminConsole({ onClose }: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'reset' | 'permissions'>('reset')
  
  // Reset user data state
  const [targetEmail, setTargetEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetResult, setResetResult] = useState<{
    success?: boolean
    message?: string
    deleted?: { folders: number; notebooks: number; notes: number }
  } | null>(null)

  const handleResetUserData = async () => {
    if (!targetEmail || !adminPassword) {
      setResetResult({ success: false, message: 'Please fill in all fields' })
      return
    }

    setIsResetting(true)
    setResetResult(null)

    try {
      // First, get the user ID from the email
      const userResponse = await fetch(`/api/admin/get-user-id?email=${encodeURIComponent(targetEmail)}`)
      
      let targetUserId: string
      
      if (!userResponse.ok) {
        // For now, use the email as the user ID (you may need to implement the get-user-id endpoint)
        console.warn('Could not fetch user ID, using email as placeholder')
        targetUserId = targetEmail
      } else {
        const userData = await userResponse.json()
        targetUserId = userData.userId
      }

      // Reset the user's data
      const response = await fetch('/api/admin/reset-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          adminPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset user data')
      }

      setResetResult({
        success: true,
        message: `Successfully reset data for ${targetEmail}`,
        deleted: data.deleted,
      })
      
      // Clear form
      setTargetEmail('')
      setAdminPassword('')
    } catch (error) {
      setResetResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset user data',
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Admin Console"
      size="lg"
    >
      {/* Admin Header */}
      <div className="flex items-center gap-2 mb-4 text-red-600">
        <Shield className="h-5 w-5" />
        <span className="font-semibold">Administrator Access</span>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('reset')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'reset'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Reset User Data
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'permissions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Permissions (Coming Soon)
        </button>
      </div>

      {/* Reset User Data Tab */}
      {activeTab === 'reset' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Danger Zone</h3>
                <p className="text-sm text-red-700 mt-1">
                  This action will permanently delete all folders, notebooks, and notes for the specified user.
                  This cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <FormField
            label="Target User Email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="user@example.com"
            type="email"
          />

          <FormField
            label="Admin Password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Enter admin password"
            type="password"
          />

          {resetResult && (
            <>
              <StatusMessage
                type={resetResult.success ? 'success' : 'error'}
                message={resetResult.message || ''}
              />
              {resetResult.success && resetResult.deleted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                  <p className="text-sm font-medium text-green-900">Deletion Summary:</p>
                  <ul className="list-disc list-inside ml-2 text-sm text-green-800 mt-1">
                    <li>{resetResult.deleted.folders} folders</li>
                    <li>{resetResult.deleted.notebooks} notebooks</li>
                    <li>{resetResult.deleted.notes} notes</li>
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <LoadingButton variant="secondary" onClick={onClose}>
              Cancel
            </LoadingButton>
            <LoadingButton
              variant="danger"
              onClick={handleResetUserData}
              loading={isResetting}
              disabled={!targetEmail || !adminPassword}
              icon={RefreshCw}
            >
              Reset User Data
            </LoadingButton>
          </div>
        </div>
      )}

      {/* Permissions Tab (Placeholder) */}
      {activeTab === 'permissions' && (
        <div className="py-12 text-center text-gray-500">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Permission Management Coming Soon</h3>
          <p className="text-sm">
            This will allow you to view and manage user permissions, ownership transfers, and access logs.
          </p>
        </div>
      )}
    </Modal>
  )
}