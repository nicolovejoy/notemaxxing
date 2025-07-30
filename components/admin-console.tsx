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
import { logger } from '@/lib/debug/logger'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

// Admin emails who can access debug console
const ADMIN_EMAILS = [
  'nicholas.lovejoy@gmail.com', // Add your email here
  'mlovejoy@scu.edu', // Add your email here
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
  folders_count?: number
  notebooks_count?: number
  notes_count?: number
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
  })
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [allUsers, setAllUsers] = useState<UserData[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Get store state
  const storeState = useStore()

  // Check if user is admin
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      if (!supabase) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        setCurrentUserId(user.id)
        setIsAdmin(ADMIN_EMAILS.includes(user.email))
      }
    }
    checkAuth()
  }, [])

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
    await storeState.initializeStore()
  }

  // Admin functions
  const loadAllUsers = async () => {
    setLoadingUsers(true)
    try {
      const supabase = createClient()
      if (!supabase) throw new Error('No Supabase client')

      // For now, just get current user and their stats
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        // Get user stats
        const { data: stats } = await supabase.rpc('get_user_stats', {
          target_user_id: user.id,
        })

        setAllUsers([
          {
            id: user.id,
            email: user.email || '',
            created_at: user.created_at,
            folders_count: stats?.[0]?.folders_count || 0,
            notebooks_count: stats?.[0]?.notebooks_count || 0,
            notes_count: stats?.[0]?.notes_count || 0,
          },
        ])
      }

      logger.info('Loaded user data')
    } catch (error) {
      logger.error('Failed to load users', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const resetUserData = async (userId: string) => {
    if (
      !confirm('Are you sure you want to delete ALL data for this user? This cannot be undone!')
    ) {
      return
    }

    try {
      const supabase = createClient()
      if (!supabase) throw new Error('No Supabase client')

      // Delete in order to respect foreign keys
      await supabase.from('notes').delete().eq('user_id', userId)
      await supabase.from('quizzes').delete().eq('user_id', userId)
      await supabase.from('notebooks').delete().eq('user_id', userId)
      await supabase.from('folders').delete().eq('user_id', userId)

      logger.info('Reset data for user', { userId })
      alert('User data reset successfully')

      // Refresh store
      await storeState.initializeStore()
    } catch (error) {
      logger.error('Failed to reset user data', error)
      alert('Failed to reset user data: ' + (error as Error).message)
    }
  }

  const seedUserData = async (userId: string) => {
    try {
      const supabase = createClient()
      if (!supabase) throw new Error('No Supabase client')

      // Run the seed function manually for this user
      const { error } = await supabase.rpc('create_starter_content_for_specific_user', {
        target_user_id: userId,
      })

      if (error) throw error

      logger.info('Seeded data for user', { userId })
      alert('Starter content added successfully')

      // Refresh store
      await storeState.initializeStore()
    } catch (error) {
      logger.error('Failed to seed user data', error)
      alert(
        'Failed to seed user data. Make sure the SQL function is deployed: ' +
          (error as Error).message
      )
    }
  }

  const exportUserData = async (userId: string) => {
    try {
      const supabase = createClient()
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
      folders: storeState.folders.length,
      notebooks: storeState.notebooks.length,
      notes: storeState.notes.length,
      quizzes: storeState.quizzes.length,
      initialized: storeState.initialized,
      syncStatus: storeState.syncState.status,
      syncError: storeState.syncState.error,
      lastSync: storeState.syncState.lastSyncTime,
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-end p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Admin Console</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{userEmail}</span>
            <button
              onClick={() => {
                if (onClose) {
                  onClose()
                } else {
                  setIsOpen(false)
                }
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    <button
                      onClick={() => currentUserId && seedUserData(currentUserId)}
                      className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      disabled={!currentUserId}
                    >
                      Seed My Data
                    </button>
                    <button
                      onClick={() => currentUserId && resetUserData(currentUserId)}
                      className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      disabled={!currentUserId}
                    >
                      Reset My Data
                    </button>
                    <button
                      onClick={() => currentUserId && exportUserData(currentUserId)}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      disabled={!currentUserId}
                    >
                      Export My Data
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Note: To seed data, first deploy the admin functions SQL to your database
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
                        <div className="font-medium">{user.email}</div>
                        <div className="text-xs text-gray-500 mt-1">ID: {user.id}</div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div className="text-center">
                            <div className="text-lg font-semibold">{user.folders_count || 0}</div>
                            <div className="text-xs text-gray-500">Folders</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">{user.notebooks_count || 0}</div>
                            <div className="text-xs text-gray-500">Notebooks</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">{user.notes_count || 0}</div>
                            <div className="text-xs text-gray-500">Notes</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Logs Section */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('logs')}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium">Logs ({logs.length})</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    clearLogs()
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedSections.logs ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </button>
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
            <button
              onClick={() => toggleSection('store')}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium">Store State</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    refreshStore()
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {expandedSections.store ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </button>
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
                <button
                  onClick={() => copyToClipboard(JSON.stringify(storeState, null, 2))}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy full state
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-xs text-gray-500">
          Press &apos;d&apos; 3 times to toggle • Admin mode for {userEmail}
        </div>
      </div>
    </div>
  )
}
