'use client'

import { useState, useEffect } from 'react'
import {
  X,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Trash2,
  Copy,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Database,
  Users,
  Loader,
} from 'lucide-react'
import { Modal, Button, IconButton } from './ui'
import { logger } from '@/lib/debug/logger'
import {
  useFolders,
  useNotebooks,
  useNotes,
  useSyncState,
  useIsInitialized,
  useDataActions,
} from '@/lib/store'
import { dataManager } from '@/lib/store/data-manager'
import { useAuth } from '@/lib/hooks/useAuth'

// Admin emails who can access debug console
const ADMIN_EMAILS = [
  'nicholas.lovejoy@gmail.com', // Nico - Developer
  'mlovejoy@scu.edu', // Max - UX Designer & Co-developer
  // Add other admin emails as needed
]

interface LogEntry {
  timestamp: Date
  level: string
  message: string
  data?: unknown
  stack?: string
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

interface AdminConsoleProps {
  onClose?: () => void
}

export function AdminConsole({ onClose }: AdminConsoleProps = {}) {
  const [isOpen, setIsOpen] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [expandedSections, setExpandedSections] = useState({
    logs: true,
    store: false,
    auth: false,
    env: false,
    database: false,
    users: false,
    sharing: false,
  })
  const [allUsers, setAllUsers] = useState<UserData[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  interface ShareInvitation {
    id: string
    resource_type: 'folder' | 'notebook'
    resource_id: string
    invited_email: string
    invited_by: string
    permission: 'read' | 'write'
    created_at: string
    expires_at: string
    accepted_at: string | null
  }

  interface SharePermission {
    id: string
    resource_type: 'folder' | 'notebook'
    resource_id: string
    user_id: string
    granted_by: string | null
    permission: 'read' | 'write'
    created_at: string
  }

  const [sharingData, setSharingData] = useState<{
    invitations: ShareInvitation[]
    permissions: SharePermission[]
    resourceNames: Record<string, string>
    userEmails: Record<string, string>
  }>({ invitations: [], permissions: [], resourceNames: {}, userEmails: {} })
  const [loadingSharing, setLoadingSharing] = useState(false)
  const [selectedInvitations, setSelectedInvitations] = useState<Set<string>>(new Set())
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())

  // Get auth state
  const { user, client: supabase } = useAuth()
  const userEmail = user?.email || null
  const currentUserId = user?.id || null
  const isAdmin = userEmail ? ADMIN_EMAILS.includes(userEmail) : false

  // Get store state using new hooks
  const folders = useFolders()
  const notebooks = useNotebooks(true) // include archived
  const notes = useNotes()
  const syncState = useSyncState()
  const isInitialized = useIsInitialized()
  const { seedInitialData } = useDataActions()

  // Listen for keyboard shortcut (triple press 'd')
  useEffect(() => {
    if (!isAdmin) return

    let keyPresses: number[] = []
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        const now = Date.now()
        keyPresses.push(now)

        // Keep only presses within last second
        keyPresses = keyPresses.filter((time) => now - time < 1000)

        if (keyPresses.length >= 3) {
          if (onClose) {
            onClose()
          } else {
            setIsOpen(!isOpen)
          }
          keyPresses = []
        }
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [isAdmin, isOpen, onClose])

  // Update logs periodically
  useEffect(() => {
    if (!isOpen) return

    const updateLogs = () => {
      setLogs(logger.getLogs())
    }

    updateLogs()
    const interval = setInterval(updateLogs, 1000)
    return () => clearInterval(interval)
  }, [isOpen])

  if (!isAdmin) return null

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearLogs = () => {
    logger.clearLogs()
    setLogs([])
  }

  const refreshStore = async () => {
    logger.info('Manually refreshing store...')
    await dataManager.refresh()
  }

  // Admin functions
  const loadAllUsers = async () => {
    setLoadingUsers(true)
    try {
      if (!supabase) throw new Error('No Supabase client')

      // Get all users using our admin function
      const { data: users, error } = await supabase.rpc('get_all_users_admin')

      if (error) {
        logger.error('Failed to load users', error)
        throw error
      }

      setAllUsers(users || [])
      logger.info(`Loaded ${users?.length || 0} users`)
    } catch (error) {
      logger.error('Failed to load users', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadSharingData = async () => {
    setLoadingSharing(true)
    try {
      if (!supabase) throw new Error('No Supabase client')

      // Load all invitations (these aren't in local store)
      const { data: invitations, error: inviteError } = await supabase
        .from('share_invitations')
        .select('*')
        .order('created_at', { ascending: false })

      if (inviteError) {
        logger.error('Error loading invitations', inviteError)
      }

      // Load all permissions (these aren't in local store)
      const { data: permissions, error: permError } = await supabase
        .from('permissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (permError) {
        logger.error('Error loading permissions', permError)
      }

      // Build resource names from local store
      const resourceNames: Record<string, string> = {}

      // Use local folders data
      folders.forEach((f) => {
        resourceNames[f.id] = f.name
      })

      // Use local notebooks data
      notebooks.forEach((n) => {
        resourceNames[n.id] = n.name
      })

      // Still need to fetch user emails as they're not in our store
      const userIds = new Set<string>()
      ;[...(invitations || []), ...(permissions || [])].forEach((item) => {
        if (item.user_id) userIds.add(item.user_id)
        if (item.granted_by) userIds.add(item.granted_by)
        if (item.invited_by) userIds.add(item.invited_by)
      })

      const userEmails: Record<string, string> = {}

      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', Array.from(userIds))

        profiles?.forEach((p) => {
          userEmails[p.id] = p.email
        })
      }

      setSharingData({
        invitations: invitations || [],
        permissions: permissions || [],
        resourceNames,
        userEmails,
      })

      logger.info(
        `Loaded ${invitations?.length || 0} invitations and ${permissions?.length || 0} permissions`
      )
    } catch (error) {
      logger.error('Failed to load sharing data', error)
    } finally {
      setLoadingSharing(false)
    }
  }

  const deleteSelectedInvitations = async () => {
    if (selectedInvitations.size === 0) return

    if (!confirm(`Delete ${selectedInvitations.size} invitation(s)? This cannot be undone.`)) {
      return
    }

    try {
      if (!supabase) throw new Error('No Supabase client')

      const { error } = await supabase
        .from('share_invitations')
        .delete()
        .in('id', Array.from(selectedInvitations))

      if (error) throw error

      logger.info(`Deleted ${selectedInvitations.size} invitations`)
      setSelectedInvitations(new Set())
      loadSharingData() // Reload
    } catch (error) {
      logger.error('Failed to delete invitations', error)
      alert('Failed to delete invitations')
    }
  }

  const deleteSelectedPermissions = async () => {
    if (selectedPermissions.size === 0) return

    if (
      !confirm(
        `Delete ${selectedPermissions.size} permission(s)? This will revoke access. This cannot be undone.`
      )
    ) {
      return
    }

    try {
      if (!supabase) throw new Error('No Supabase client')

      const { error } = await supabase
        .from('permissions')
        .delete()
        .in('id', Array.from(selectedPermissions))

      if (error) throw error

      logger.info(`Deleted ${selectedPermissions.size} permissions`)
      setSelectedPermissions(new Set())
      loadSharingData() // Reload
    } catch (error) {
      logger.error('Failed to delete permissions', error)
      alert('Failed to delete permissions')
    }
  }

  const resetUserData = async (userId: string) => {
    if (
      !confirm('Are you sure you want to delete ALL data for this user? This cannot be undone!')
    ) {
      return
    }

    // Prompt for admin password
    const adminPassword = prompt('Enter admin password to confirm deletion:')
    if (!adminPassword) {
      alert('Operation cancelled')
      return
    }

    logger.info('Starting reset for user', { userId })
    console.log('🔒 Using secure admin endpoint for user:', userId)

    try {
      // Call the secure admin API endpoint
      const response = await fetch('/api/admin/reset-user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          adminPassword: adminPassword,
        }),
      })

      const result = await response.json()

      console.log('📥 API Response:', { status: response.status, result })

      if (!response.ok) {
        if (response.status === 403 && result.error === 'Invalid admin password') {
          throw new Error('Invalid admin password')
        }
        throw new Error(result.error || 'Failed to reset user data')
      }

      // Success!
      logger.info('Reset successful via admin API', { userId, result })
      console.log('✅ Successfully deleted:', result.deleted)
      console.log('📊 Remaining (should be 0):', result.remaining)

      if (
        result.remaining.folders > 0 ||
        result.remaining.notebooks > 0 ||
        result.remaining.notes > 0
      ) {
        alert(`Warning: Some data may remain. Check console for details.`)
      } else {
        alert(
          `User data reset successfully!\n\nDeleted:\n- ${result.deleted.folders} folders\n- ${result.deleted.notebooks} notebooks\n- ${result.deleted.notes} notes`
        )
      }

      // Refresh store if it's the current user
      if (userId === currentUserId) {
        await dataManager.refresh()
      }

      // Refresh user list to update counts
      await loadAllUsers()
    } catch (error) {
      logger.error('Failed to reset user data', {
        error,
        message: (error as Error).message,
        stack: (error as Error).stack,
      })
      console.error('Full error object:', error)
      alert(
        'Failed to reset user data: ' + (error as Error).message + '\n\nCheck console for details.'
      )
    }
  }

  const seedUserData = async (userId: string) => {
    try {
      if (!supabase) throw new Error('No Supabase client')

      // Use the admin function to seed data for any user
      const { error } = await supabase.rpc('create_starter_content_for_specific_user', {
        target_user_id: userId,
      })

      if (error) {
        // If the function doesn't exist or fails, fall back to current user only
        if (userId === currentUserId) {
          const result = await seedInitialData('default-with-tutorials')
          if (result.success) {
            logger.info('Seeded data for current user', { userId })
            alert('Starter content added successfully!')
          } else {
            throw new Error(result.error || 'Failed to seed data')
          }
        } else {
          throw new Error('Cannot seed data for other users')
        }
      } else {
        logger.info('Seeded data for user', { userId })
        alert('Starter content added successfully!')
      }

      // Refresh store if it's the current user
      if (userId === currentUserId) {
        await dataManager.refresh()
      }

      // Refresh user list to update counts
      await loadAllUsers()
    } catch (error) {
      logger.error('Failed to seed user data', error)
      alert('Failed to seed user data: ' + (error as Error).message)
    }
  }

  const exportUserData = async (userId: string) => {
    try {
      if (!supabase) throw new Error('No Supabase client')

      // Get all user data
      const [folders, notebooks, notes, quizzes] = await Promise.all([
        supabase.from('folders').select('*').eq('user_id', userId),
        supabase.from('notebooks').select('*').eq('user_id', userId),
        supabase.from('notes').select('*').eq('user_id', userId),
        supabase.from('quizzes').select('*').eq('user_id', userId),
      ])

      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        folders: folders.data || [],
        notebooks: notebooks.data || [],
        notes: notes.data || [],
        quizzes: quizzes.data || [],
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notemaxxing-export-${userId}-${new Date().toISOString().split('T')[0]}.json`
      a.click()

      logger.info('Exported data for user', { userId })
    } catch (error) {
      logger.error('Failed to export user data', error)
      alert('Failed to export user data: ' + (error as Error).message)
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    if (
      !confirm(
        `Are you sure you want to DELETE the user account: ${userEmail}?\n\nThis will permanently delete:\n- The user account\n- All folders\n- All notebooks\n- All notes\n- All quizzes\n\nThis CANNOT be undone!`
      )
    ) {
      return
    }

    // Double confirmation for safety
    const confirmEmail = prompt(`Type the user's email (${userEmail}) to confirm deletion:`)
    if (confirmEmail !== userEmail) {
      alert('Email does not match. Deletion cancelled.')
      return
    }

    try {
      if (!supabase) throw new Error('No Supabase client')

      const { error } = await supabase.rpc('delete_user_admin', {
        user_id: userId,
      })

      if (error) {
        throw error
      }

      logger.info('Deleted user', { userId, userEmail })
      alert(`User ${userEmail} has been deleted successfully.`)

      // Refresh the user list
      await loadAllUsers()
    } catch (error) {
      logger.error('Failed to delete user', error)
      alert('Failed to delete user: ' + (error as Error).message)
    }
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStoreStats = () => {
    return {
      folders: folders.length,
      notebooks: notebooks.length,
      notes: notes.length,
      quizzes: 0, // Quizzes not implemented in new store
      initialized: isInitialized,
      syncStatus: syncState.status,
      syncError: syncState.error,
      lastSync: syncState.lastSyncTime,
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => (onClose ? onClose() : setIsOpen(false))}
      size="lg"
      title="Admin Console"
    >
      <div className="h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Admin Console</h2>
            <p className="text-sm text-gray-500 mt-1">Logged in as: {userEmail}</p>
            {!isAdmin && <p className="text-sm text-red-600 mt-1">⚠️ You are not an admin</p>}
          </div>
          <IconButton
            icon={X}
            onClick={() => (onClose ? onClose() : setIsOpen(false))}
            size="sm"
            variant="ghost"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Database Management Section */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('database')}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium flex items-center gap-2">
                <Database className="w-4 h-4" />
                Database Management
              </span>
              {expandedSections.database ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {expandedSections.database && (
              <div className="p-4 space-y-3">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Quick Actions</h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => currentUserId && seedUserData(currentUserId)}
                      variant="primary"
                      size="sm"
                      disabled={!currentUserId}
                    >
                      Add Starter Content
                    </Button>
                    <Button
                      onClick={() => currentUserId && resetUserData(currentUserId)}
                      variant="danger"
                      size="sm"
                      disabled={!currentUserId}
                    >
                      Reset My Data
                    </Button>
                    <Button
                      onClick={() => currentUserId && exportUserData(currentUserId)}
                      variant="secondary"
                      size="sm"
                      disabled={!currentUserId}
                    >
                      Export My Data
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Note: Starter content can only be added if you have no existing folders
                </div>
              </div>
            )}
          </div>

          {/* Users Management Section */}
          <div className="border rounded-lg">
            <button
              onClick={() => {
                toggleSection('users')
                if (!expandedSections.users) loadAllUsers()
              }}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                User Stats
              </span>
              {expandedSections.users ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {expandedSections.users && (
              <div className="p-4 space-y-3">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allUsers.map((user) => (
                      <div key={user.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">{user.email}</div>
                            <div className="text-xs text-gray-500 mt-1">ID: {user.id}</div>
                            <div className="text-xs text-gray-500">
                              Created: {new Date(user.created_at).toLocaleDateString()}
                            </div>
                            {user.last_sign_in_at && (
                              <div className="text-xs text-gray-500">
                                Last login:{' '}
                                {new Date(user.last_sign_in_at).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </div>
                          <IconButton
                            icon={Trash2}
                            onClick={() => deleteUser(user.id, user.email)}
                            size="sm"
                            variant="danger"
                            title="Delete user"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          <div className="text-center">
                            <div className="text-lg font-semibold">{user.folder_count}</div>
                            <div className="text-xs text-gray-500">Folders</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">{user.notebook_count}</div>
                            <div className="text-xs text-gray-500">Notebooks</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">{user.note_count}</div>
                            <div className="text-xs text-gray-500">Notes</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">{user.quiz_count}</div>
                            <div className="text-xs text-gray-500">Quizzes</div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button onClick={() => exportUserData(user.id)} variant="ghost" size="sm">
                            Export
                          </Button>
                          <Button onClick={() => seedUserData(user.id)} variant="ghost" size="sm">
                            Add Starter
                          </Button>
                          <Button onClick={() => resetUserData(user.id)} variant="ghost" size="sm">
                            Clear Data
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sharing & Invitations Section */}
          <div className="border rounded-lg">
            <button
              onClick={() => {
                toggleSection('sharing')
                if (!expandedSections.sharing) loadSharingData()
              }}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Sharing & Invitations
              </span>
              {expandedSections.sharing ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {expandedSections.sharing && (
              <div className="p-4 space-y-4">
                {loadingSharing ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">
                          Invitations ({sharingData.invitations.length})
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setSelectedInvitations(
                                new Set(sharingData.invitations.map((i) => i.id))
                              )
                            }
                          >
                            Select All
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={deleteSelectedInvitations}
                            disabled={selectedInvitations.size === 0}
                          >
                            Delete Selected ({selectedInvitations.size})
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {sharingData.invitations.length === 0 ? (
                          <p className="text-gray-500 text-sm">No active invitations</p>
                        ) : (
                          sharingData.invitations.map((invite) => (
                            <div key={invite.id} className="border rounded p-2 text-xs">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedInvitations.has(invite.id)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedInvitations)
                                    if (e.target.checked) {
                                      newSelected.add(invite.id)
                                    } else {
                                      newSelected.delete(invite.id)
                                    }
                                    setSelectedInvitations(newSelected)
                                  }}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{invite.invited_email}</span>
                                    <span
                                      className={`px-2 py-1 rounded text-xs ${
                                        invite.accepted_at
                                          ? 'bg-green-100 text-green-800'
                                          : new Date(invite.expires_at) < new Date()
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                      }`}
                                    >
                                      {invite.accepted_at
                                        ? 'Accepted'
                                        : new Date(invite.expires_at) < new Date()
                                          ? 'Expired'
                                          : 'Pending'}
                                    </span>
                                  </div>
                                  <div className="text-gray-600 mt-1">
                                    <div className="font-medium text-black">
                                      {invite.resource_type === 'folder' ? '📁' : '📓'}{' '}
                                      {sharingData.resourceNames[invite.resource_id] || 'Unknown'}
                                    </div>
                                    <div>Permission: {invite.permission}</div>
                                    <div>
                                      Invited by:{' '}
                                      {sharingData.userEmails[invite.invited_by] ||
                                        invite.invited_by}
                                    </div>
                                    <div>
                                      Created: {new Date(invite.created_at).toLocaleString()}
                                    </div>
                                    {invite.accepted_at && (
                                      <div>
                                        Accepted: {new Date(invite.accepted_at).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">
                          Permissions ({sharingData.permissions.length})
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setSelectedPermissions(
                                new Set(sharingData.permissions.map((p) => p.id))
                              )
                            }
                          >
                            Select All
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={deleteSelectedPermissions}
                            disabled={selectedPermissions.size === 0}
                          >
                            Delete Selected ({selectedPermissions.size})
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {sharingData.permissions.length === 0 ? (
                          <p className="text-gray-500 text-sm">No active permissions</p>
                        ) : (
                          sharingData.permissions.map((perm) => (
                            <div key={perm.id} className="border rounded p-2 text-xs">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.has(perm.id)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedPermissions)
                                    if (e.target.checked) {
                                      newSelected.add(perm.id)
                                    } else {
                                      newSelected.delete(perm.id)
                                    }
                                    setSelectedPermissions(newSelected)
                                  }}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <span className="font-medium">
                                      {sharingData.userEmails[perm.user_id] || perm.user_id}
                                    </span>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                      {perm.permission}
                                    </span>
                                  </div>
                                  <div className="text-gray-600 mt-1">
                                    <div className="font-medium text-black">
                                      {perm.resource_type === 'folder' ? '📁' : '📓'}{' '}
                                      {sharingData.resourceNames[perm.resource_id] || 'Unknown'}
                                    </div>
                                    <div>
                                      Granted by:{' '}
                                      {perm.granted_by
                                        ? sharingData.userEmails[perm.granted_by] || perm.granted_by
                                        : 'System'}
                                    </div>
                                    <div>Created: {new Date(perm.created_at).toLocaleString()}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Logs Section */}
          <div className="border rounded-lg">
            <div className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50">
              <button
                onClick={() => toggleSection('logs')}
                className="flex-1 text-left flex items-center gap-2"
              >
                <span className="font-medium">Logs ({logs.length})</span>
                {expandedSections.logs ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <IconButton
                icon={Trash2}
                onClick={clearLogs}
                size="sm"
                variant="ghost"
                title="Clear logs"
              />
            </div>
            {expandedSections.logs && (
              <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-sm">No logs yet</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      {getLogIcon(log.level)}
                      <div className="flex-1">
                        <span className="text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="ml-2">{log.message}</span>
                        {log.data !== undefined && (
                          <pre className="text-xs bg-gray-100 p-1 rounded mt-1">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Store State Section */}
          <div className="border rounded-lg">
            <div className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50">
              <button
                onClick={() => toggleSection('store')}
                className="flex-1 text-left flex items-center gap-2"
              >
                <span className="font-medium">Store State</span>
                {expandedSections.store ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <IconButton
                icon={RefreshCw}
                onClick={refreshStore}
                size="sm"
                variant="ghost"
                title="Refresh store"
              />
            </div>
            {expandedSections.store && (
              <div className="p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(getStoreStats()).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-mono">{value?.toString() || 'null'}</span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => copyToClipboard(JSON.stringify(getStoreStats(), null, 2))}
                  variant="ghost"
                  size="sm"
                  icon={Copy}
                >
                  Copy store stats
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t text-xs text-gray-500">
          Press &apos;d&apos; 3 times to toggle • Admin mode
        </div>
      </div>
    </Modal>
  )
}
