'use client'

import { useEffect, useState } from 'react'
import { dataStore } from '@/lib/store/data-store'
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'

export function RealtimeStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | 'error'>(
    'disconnected'
  )

  useEffect(() => {
    const unsubscribe = dataStore.subscribe((state) => {
      setStatus(state.syncState.realtimeStatus)
    })

    return unsubscribe
  }, [])

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: 'Connected',
      pulse: false,
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      label: 'Disconnected',
      pulse: false,
    },
    reconnecting: {
      icon: RefreshCw,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      label: 'Reconnecting...',
      pulse: true,
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      label: 'Connection Error',
      pulse: false,
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md ${config.bgColor} ${config.color} transition-all duration-300`}
        title={`Real-time sync: ${config.label}`}
      >
        <Icon className={`w-4 h-4 ${config.pulse ? 'animate-spin' : ''}`} />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    </div>
  )
}
