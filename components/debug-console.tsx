'use client'

import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronRight, RefreshCw, Trash2, Copy, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { logger } from '@/lib/debug/logger'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

// Admin emails who can access debug console
const ADMIN_EMAILS = [
  'nicolovejoy@gmail.com', // Add your email here
  // Add other admin emails as needed
]

interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  data?: unknown;
  stack?: string;
}

export function DebugConsole() {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [expandedSections, setExpandedSections] = useState({
    logs: true,
    store: false,
    auth: false,
    env: false,
  })
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Get store state
  const storeState = useStore()

  // Check if user is admin
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      if (!supabase) return
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
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
        keyPresses = keyPresses.filter(time => now - time < 1000)
        
        if (keyPresses.length >= 3) {
          setIsOpen(!isOpen)
          keyPresses = []
        }
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [isAdmin, isOpen])

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
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
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

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info': return <Info className="w-4 h-4 text-blue-500" />
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />
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
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-lg shadow-lg hover:bg-gray-700 z-50"
        title="Debug Console (or press 'd' 3 times)"
      >
        🐛
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-end p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Debug Console</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{userEmail}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                {expandedSections.logs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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
                        <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
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
                {expandedSections.store ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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

          {/* Auth Section */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('auth')}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium">Auth Info</span>
              {expandedSections.auth ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedSections.auth && (
              <div className="p-4 space-y-2 text-sm">
                <div>Email: {userEmail}</div>
                <div>Is Admin: {isAdmin ? 'Yes' : 'No'}</div>
                <div>Supabase Client: {createClient() ? 'Connected' : 'Not Available'}</div>
              </div>
            )}
          </div>

          {/* Environment Section */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('env')}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-medium">Environment</span>
              {expandedSections.env ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedSections.env && (
              <div className="p-4 space-y-2 text-sm">
                <div>Node Env: {process.env.NODE_ENV}</div>
                <div>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Not Set'}</div>
                <div>Supabase Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not Set'}</div>
                <div>Browser: {typeof window !== 'undefined' ? navigator.userAgent.split(' ').pop() : 'SSR'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-xs text-gray-500">
          Press &apos;d&apos; 3 times to toggle • Debug mode for {userEmail}
        </div>
      </div>
    </div>
  )
}