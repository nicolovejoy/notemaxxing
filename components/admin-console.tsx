'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/firebase/api-fetch'
import { Modal } from './ui/Modal'
import { StatusMessage } from './ui/StatusMessage'
import { LoadingButton } from './ui/LoadingButton'
import { Skeleton } from './ui/Skeleton'
import {
  User,
  FileText,
  FolderOpen,
  StickyNote,
  Share2,
  RefreshCw,
  Trash2,
  Users,
  Activity,
  Heart,
  Database,
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronRight,
  Ghost,
} from 'lucide-react'

interface AdminConsoleProps {
  onClose: () => void
}

interface UserData {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
  is_admin: boolean
  stats: {
    folders: number
    notebooks: number
    notes: number
    permissions_granted: number
    permissions_received: number
  }
}

interface PermissionData {
  id: string
  user_id: string
  user_email: string
  resource_id: string
  resource_type: 'folder' | 'notebook'
  resource_name: string
  permission: 'read' | 'write'
  granted_by: string
  granted_by_email: string
  granted_at: string
}

interface InvitationData {
  id: string
  resource_id: string
  resource_type: 'folder' | 'notebook'
  resource_name: string
  invited_by: string
  invited_by_email: string
  permission: 'read' | 'write'
  created_at: string
  expires_at: string
}

interface PermissionStats {
  total_permissions: number
  total_folders_shared: number
  total_notebooks_shared: number
  pending_invitations: number
}

interface SystemStats {
  overview: {
    total_users: number
    active_users_30d: number
    new_users_7d: number
    total_folders: number
    total_notebooks: number
    total_notes: number
    total_permissions: number
    pending_invitations: number
  }
  averages: {
    folders_per_user: number
    notebooks_per_user: number
    notes_per_user: number
  }
  top_creators: Array<{ email: string; count: number }>
  top_sharers: Array<{ email: string; count: number }>
}

export function AdminConsole({ onClose }: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'stats' | 'health'>('users')
  const [users, setUsers] = useState<UserData[]>([])
  const [permissions, setPermissions] = useState<PermissionData[]>([])
  const [invitations, setInvitations] = useState<InvitationData[]>([])
  const [permissionStats, setPermissionStats] = useState<PermissionStats | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resettingUser, setResettingUser] = useState<string | null>(null)
  const [showAnonymous, setShowAnonymous] = useState(false)

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'permissions') {
      fetchPermissions()
    } else if (activeTab === 'stats') {
      fetchStats()
    }
  }, [activeTab])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch('/api/admin/users')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch('/api/admin/permissions')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch permissions')
      }
      const data = await response.json()
      setPermissions(data.permissions)
      setInvitations(data.invitations)
      setPermissionStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch('/api/admin/stats')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch stats')
      }
      const data = await response.json()
      setSystemStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  const handleResetUserData = async (userId: string, email: string) => {
    if (
      !confirm(`Are you sure you want to delete ALL data for user ${email}? This cannot be undone!`)
    ) {
      return
    }

    const adminPassword = prompt('Enter admin password:')
    if (!adminPassword) return

    setResettingUser(userId)
    try {
      const response = await apiFetch('/api/admin/reset-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, adminPassword }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset user data')
      }

      // Refresh users list
      await fetchUsers()
      alert(`Successfully reset data for ${email}`)
    } catch (err) {
      alert(`Failed to reset user data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setResettingUser(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Modal isOpen onClose={onClose} title="Admin Console" size="lg">
      <div className="flex flex-col h-[600px]">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Permissions
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Stats
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'health'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Health
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {activeTab === 'users' && (
            <div>
              {/* Refresh button */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  {users.filter((u) => u.email !== 'No email').length} users
                  {users.filter((u) => u.email === 'No email').length > 0 && (
                    <span className="text-gray-400 font-normal">
                      {' '}
                      + {users.filter((u) => u.email === 'No email').length} anonymous
                    </span>
                  )}
                </h3>
                <button
                  onClick={fetchUsers}
                  disabled={loading}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {error && (
                <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />
              )}

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Real users */}
                  {users
                    .filter((u) => u.email !== 'No email')
                    .map((user) => (
                      <div
                        key={user.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{user.email}</span>
                              {user.is_admin && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">ID: {user.id}</div>
                            <div className="mt-2 flex gap-4 text-xs text-gray-600">
                              <span>Created: {formatDate(user.created_at)}</span>
                              {user.last_sign_in_at && (
                                <span>Last sign in: {formatDate(user.last_sign_in_at)}</span>
                              )}
                            </div>
                            <div className="mt-3 flex gap-4">
                              <div className="flex items-center gap-1">
                                <FolderOpen className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {user.stats.folders} folders
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {user.stats.notebooks} notebooks
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <StickyNote className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {user.stats.notes} notes
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Share2 className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {user.stats.permissions_granted} shared /{' '}
                                  {user.stats.permissions_received} received
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            <LoadingButton
                              size="sm"
                              variant="danger"
                              icon={Trash2}
                              loading={resettingUser === user.id}
                              onClick={() => handleResetUserData(user.id, user.email)}
                              disabled={user.is_admin}
                              title={user.is_admin ? "Can't reset admin users" : 'Reset user data'}
                            >
                              Reset
                            </LoadingButton>
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Anonymous users (collapsible) */}
                  {users.filter((u) => u.email === 'No email').length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowAnonymous(!showAnonymous)}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
                      >
                        {showAnonymous ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Ghost className="h-4 w-4" />
                        <span>
                          {users.filter((u) => u.email === 'No email').length} anonymous accounts
                        </span>
                      </button>
                      {showAnonymous && (
                        <div className="space-y-2">
                          {users
                            .filter((u) => u.email === 'No email')
                            .map((user) => (
                              <div
                                key={user.id}
                                className="border border-gray-100 rounded-lg p-3 bg-gray-50"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="text-xs text-gray-500">ID: {user.id}</div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      Created: {formatDate(user.created_at)}
                                      {user.last_sign_in_at &&
                                        ` | Last sign in: ${formatDate(user.last_sign_in_at)}`}
                                    </div>
                                    {(user.stats.folders > 0 ||
                                      user.stats.notebooks > 0 ||
                                      user.stats.notes > 0) && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {user.stats.folders}F / {user.stats.notebooks}NB /{' '}
                                        {user.stats.notes}N
                                      </div>
                                    )}
                                  </div>
                                  <LoadingButton
                                    size="sm"
                                    variant="danger"
                                    icon={Trash2}
                                    loading={resettingUser === user.id}
                                    onClick={() => handleResetUserData(user.id, user.email)}
                                  >
                                    Reset
                                  </LoadingButton>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div>
              {/* Stats and refresh */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-700">
                  {permissionStats && (
                    <div className="flex gap-4">
                      <span>Total: {permissionStats.total_permissions}</span>
                      <span>Folders: {permissionStats.total_folders_shared}</span>
                      <span>Notebooks: {permissionStats.total_notebooks_shared}</span>
                      <span>Pending Invites: {permissionStats.pending_invitations}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={fetchPermissions}
                  disabled={loading}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {error && (
                <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />
              )}

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active Permissions */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Active Permissions</h3>
                    {permissions.length === 0 ? (
                      <div className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded">
                        No active permissions
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {permissions.map((perm) => (
                          <div
                            key={perm.id}
                            className="border border-gray-200 rounded p-3 text-sm hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{perm.granted_by_email}</span>
                                <span className="text-gray-500">shared</span>
                                <span
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    perm.resource_type === 'folder'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {perm.resource_type}
                                </span>
                                <span className="font-medium">
                                  &quot;{perm.resource_name}&quot;
                                </span>
                                <span className="text-gray-500">with</span>
                                <span className="font-medium">{perm.user_email}</span>
                              </div>
                              <span
                                className={`px-2 py-0.5 text-xs rounded ${
                                  perm.permission === 'write'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {perm.permission}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(perm.granted_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pending Invitations */}
                  {invitations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Pending Invitations
                      </h3>
                      <div className="space-y-2">
                        {invitations.map((inv) => (
                          <div
                            key={inv.id}
                            className="border border-yellow-200 bg-yellow-50 rounded p-3 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{inv.invited_by_email}</span>
                                <span className="text-gray-500">invited someone to</span>
                                <span
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    inv.resource_type === 'folder'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {inv.resource_type}
                                </span>
                                <span className="font-medium">&quot;{inv.resource_name}&quot;</span>
                              </div>
                              <span
                                className={`px-2 py-0.5 text-xs rounded ${
                                  inv.permission === 'write'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {inv.permission}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Expires: {formatDate(inv.expires_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'health' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="h-6 w-6 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900">System Health Monitoring</h3>
                </div>

                <div className="space-y-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-700">
                    Coming soon: Real-time health monitoring for your Notemaxxing instance
                  </p>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Planned Metrics:</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <Database className="h-4 w-4 text-blue-500 mt-0.5" />
                          <div>
                            <span className="font-medium">Database Health</span>
                            <div className="text-xs text-gray-500">
                              Size, connections, query performance
                            </div>
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                          <div>
                            <span className="font-medium">Error Tracking</span>
                            <div className="text-xs text-gray-500">
                              API errors, failed operations
                            </div>
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <Zap className="h-4 w-4 text-purple-500 mt-0.5" />
                          <div>
                            <span className="font-medium">Performance</span>
                            <div className="text-xs text-gray-500">
                              Response times, slow queries
                            </div>
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <Users className="h-4 w-4 text-green-500 mt-0.5" />
                          <div>
                            <span className="font-medium">Real-time Connections</span>
                            <div className="text-xs text-gray-500">
                              Active users, WebSocket status
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Why This Matters:</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Proactive issue detection before users notice</li>
                        <li>• Identify performance bottlenecks</li>
                        <li>• Monitor database growth trends</li>
                        <li>• Track error patterns for debugging</li>
                        <li>• Ensure optimal user experience</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Note:</span> As the platform grows, this tab
                      will provide critical insights into system health, helping maintain
                      reliability and performance at scale.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={fetchStats}
                  disabled={loading}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {error && (
                <StatusMessage type="error" message={error} onDismiss={() => setError(null)} />
              )}

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : systemStats ? (
                <div className="space-y-6">
                  {/* Overview Grid */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">System Overview</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-600">Users</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {systemStats.overview.total_users}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {systemStats.overview.active_users_30d} active (30d)
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          +{systemStats.overview.new_users_7d} new (7d)
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FolderOpen className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-600">Content</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {systemStats.overview.total_folders}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {systemStats.overview.total_notebooks} notebooks
                        </div>
                        <div className="text-xs text-gray-600">
                          {systemStats.overview.total_notes} notes
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Share2 className="h-4 w-4 text-purple-600" />
                          <span className="text-xs font-medium text-purple-600">Sharing</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {systemStats.overview.total_permissions}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">active permissions</div>
                        <div className="text-xs text-yellow-600 mt-1">
                          {systemStats.overview.pending_invitations} pending
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4 text-orange-600" />
                          <span className="text-xs font-medium text-orange-600">Averages</span>
                        </div>
                        <div className="text-xs text-gray-700 space-y-1">
                          <div>{systemStats.averages.folders_per_user} folders/user</div>
                          <div>{systemStats.averages.notebooks_per_user} notebooks/user</div>
                          <div>{systemStats.averages.notes_per_user} notes/user</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Users */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Top Content Creators
                      </h3>
                      <div className="space-y-2">
                        {systemStats.top_creators.length === 0 ? (
                          <div className="text-sm text-gray-500">No data yet</div>
                        ) : (
                          systemStats.top_creators.map((creator, index) => (
                            <div
                              key={creator.email}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">{index + 1}.</span>
                                <span className="text-gray-700">{creator.email}</span>
                              </div>
                              <span className="font-medium text-gray-900">
                                {creator.count} items
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Sharers</h3>
                      <div className="space-y-2">
                        {systemStats.top_sharers.length === 0 ? (
                          <div className="text-sm text-gray-500">No sharing activity yet</div>
                        ) : (
                          systemStats.top_sharers.map((sharer, index) => (
                            <div
                              key={sharer.email}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">{index + 1}.</span>
                                <span className="text-gray-700">{sharer.email}</span>
                              </div>
                              <span className="font-medium text-gray-900">
                                {sharer.count} shares
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No stats available</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
