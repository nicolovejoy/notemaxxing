'use client'

import { useState } from 'react'
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  Users,
  Database,
  Download,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  FolderOpen,
  BookOpen,
  FileText,
} from 'lucide-react'
import { Modal } from './ui/Modal'
import { LoadingButton } from './ui/LoadingButton'
import { FormField } from './ui/FormField'
import { StatusMessage } from './ui/StatusMessage'
import { Button } from './ui/Button'
import { useAuth } from '@/lib/hooks/useAuth'

interface AdminConsoleProps {
  onClose: () => void
}

interface UserData {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
  folder_count: number
  notebook_count: number
  note_count: number
  quiz_count: number
}

export function AdminConsole({ onClose }: AdminConsoleProps) {
  const { user, client: supabase } = useAuth()
  const currentUserId = user?.id
  const currentUserEmail = user?.email

  const [activeTab, setActiveTab] = useState<'database' | 'users' | 'reset'>('database')
  const [expandedSections, setExpandedSections] = useState({
    quickActions: true,
    userStats: false,
  })

  // Reset user data state
  const [targetEmail, setTargetEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetResult, setResetResult] = useState<{
    success?: boolean
    message?: string
    deleted?: { folders: number; notebooks: number; notes: number }
  } | null>(null)

  // User management state
  const [allUsers, setAllUsers] = useState<UserData[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null)

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const loadAllUsers = async () => {
    setLoadingUsers(true)
    try {
      if (!supabase) throw new Error('No Supabase client')

      // Get all users using admin function
      const { data: users, error } = await supabase.rpc('get_all_users_admin')

      if (error) {
        console.error('Failed to load users:', error)
        throw error
      }

      setAllUsers(users || [])
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const seedUserData = async (userId: string) => {
    if (!confirm('Add starter content for this user?')) return

    setUserActionLoading(userId)
    try {
      if (!supabase) throw new Error('No Supabase client')

      const { error } = await supabase.rpc('create_starter_content_for_specific_user', {
        target_user_id: userId,
      })

      if (error) throw error

      alert('Starter content added successfully!')
      await loadAllUsers() // Refresh counts
    } catch (error) {
      console.error('Failed to seed user data:', error)
      alert('Failed to add starter content')
    } finally {
      setUserActionLoading(null)
    }
  }

  const exportUserData = async (userId: string) => {
    setUserActionLoading(userId)
    try {
      if (!supabase) throw new Error('No Supabase client')

      // NOTE: Currently only works for the current user due to RLS policies
      // Exporting other users' data returns empty results
      // TODO: Create admin-specific RPC function to export any user's data

      // Get all user data
      const [folders, notebooks, notes] = await Promise.all([
        supabase.from('folders').select('*').eq('user_id', userId),
        supabase.from('notebooks').select('*').eq('user_id', userId),
        supabase.from('notes').select('*').eq('user_id', userId),
      ])

      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        folders: folders.data || [],
        notebooks: notebooks.data || [],
        notes: notes.data || [],
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notemaxxing-export-${userId}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export user data:', error)
      alert('Failed to export user data')
    } finally {
      setUserActionLoading(null)
    }
  }

  const resetUserData = async (userId: string, userEmail: string) => {
    if (!confirm(`Delete ALL data for ${userEmail}?\n\nThis cannot be undone!`)) return

    const password = prompt('Enter admin password to confirm:')
    if (!password) return

    setUserActionLoading(userId)
    try {
      const response = await fetch('/api/admin/reset-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          adminPassword: password,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to reset')

      alert(
        `Deleted: ${result.deleted.folders} folders, ${result.deleted.notebooks} notebooks, ${result.deleted.notes} notes`
      )
      await loadAllUsers()
    } catch (error) {
      alert('Failed to reset: ' + (error as Error).message)
    } finally {
      setUserActionLoading(null)
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`DELETE user account ${userEmail}?\n\nThis will delete EVERYTHING!`)) return

    const confirmEmail = prompt(`Type "${userEmail}" to confirm:`)
    if (confirmEmail !== userEmail) {
      alert('Email does not match')
      return
    }

    setUserActionLoading(userId)
    try {
      if (!supabase) throw new Error('No Supabase client')

      const { error } = await supabase.rpc('delete_user_admin', { user_id: userId })
      if (error) throw error

      alert(`User ${userEmail} deleted successfully`)
      await loadAllUsers()
    } catch (error) {
      alert('Failed to delete user: ' + (error as Error).message)
    } finally {
      setUserActionLoading(null)
    }
  }

  const handleResetUserData = async () => {
    if (!targetEmail || !adminPassword) {
      setResetResult({ success: false, message: 'Please fill in all fields' })
      return
    }

    setIsResetting(true)
    setResetResult(null)

    try {
      // First, get the user ID from the email
      const userResponse = await fetch(
        `/api/admin/get-user-id?email=${encodeURIComponent(targetEmail)}`
      )

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
    <Modal isOpen={true} onClose={onClose} title="Admin Console" size="lg">
      {/* Admin Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-red-600">
          <Shield className="h-5 w-5" />
          <span className="font-semibold">Administrator Access</span>
        </div>
        <span className="text-sm text-gray-500">{currentUserEmail}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'database'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Database Management
        </button>
        <button
          onClick={() => {
            setActiveTab('users')
            if (allUsers.length === 0) loadAllUsers()
          }}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          User Stats
        </button>
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
      </div>

      {/* Database Management Tab */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          {/* Quick Actions Section */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('quickActions')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Quick Actions
              </span>
              {expandedSections.quickActions ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {expandedSections.quickActions && (
              <div className="p-4 border-t space-y-3">
                <p className="text-sm text-gray-600 mb-3">Manage your own data quickly</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => currentUserId && seedUserData(currentUserId)}
                    disabled={!currentUserId}
                  >
                    Add Starter Content
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    onClick={() => currentUserId && exportUserData(currentUserId)}
                    disabled={!currentUserId}
                  >
                    Export My Data
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={RefreshCw}
                    onClick={() =>
                      currentUserId &&
                      currentUserEmail &&
                      resetUserData(currentUserId, currentUserEmail)
                    }
                    disabled={!currentUserId}
                  >
                    Reset My Data
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Note: Starter content can only be added if you have no existing folders
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Stats Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="border rounded-lg">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                All Users ({allUsers.length})
              </span>
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={loadAllUsers}
                disabled={loadingUsers}
              >
                Refresh
              </Button>
            </div>
            <div className="p-4">
              {loadingUsers ? (
                <div className="text-center py-8 text-gray-500">Loading users...</div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found. Click refresh to load.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allUsers.map((userData) => (
                    <div key={userData.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium">{userData.email}</div>
                          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                            <div>ID: {userData.id}</div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Created: {new Date(userData.created_at).toLocaleDateString()}
                            </div>
                            {userData.last_sign_in_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last login: {new Date(userData.last_sign_in_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                          onClick={() => deleteUser(userData.id, userData.email)}
                          disabled={userActionLoading === userData.id}
                        >
                          Delete
                        </Button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <FolderOpen className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                          <div className="text-lg font-semibold">{userData.folder_count}</div>
                          <div className="text-xs text-gray-500">Folders</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <BookOpen className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                          <div className="text-lg font-semibold">{userData.notebook_count}</div>
                          <div className="text-xs text-gray-500">Notebooks</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <FileText className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                          <div className="text-lg font-semibold">{userData.note_count}</div>
                          <div className="text-xs text-gray-500">Notes</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-lg font-semibold">{userData.quiz_count}</div>
                          <div className="text-xs text-gray-500">Quizzes</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div
                          title={
                            userData.id !== currentUserId
                              ? 'Export for other users not yet implemented'
                              : 'Export user data'
                          }
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Download}
                            onClick={() => exportUserData(userData.id)}
                            disabled={
                              userActionLoading === userData.id || userData.id !== currentUserId
                            }
                          >
                            Export
                          </Button>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Plus}
                          onClick={() => seedUserData(userData.id)}
                          disabled={userActionLoading === userData.id}
                        >
                          Add Starter
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={RefreshCw}
                          onClick={() => resetUserData(userData.id, userData.email)}
                          disabled={userActionLoading === userData.id}
                        >
                          Clear Data
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset User Data Tab */}
      {activeTab === 'reset' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Danger Zone</h3>
                <p className="text-sm text-red-700 mt-1">
                  This action will permanently delete all folders, notebooks, and notes for the
                  specified user. This cannot be undone.
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
    </Modal>
  )
}
