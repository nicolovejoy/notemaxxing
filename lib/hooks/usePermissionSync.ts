import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { invalidateQueries } from '@/lib/query/query-client'
import { useAuth } from './useAuth'

/**
 * ARCHITECTURE EXCEPTION: Direct Supabase Realtime Subscription
 *
 * This hook violates our standard "Component → API → Supabase" pattern by
 * subscribing directly to Supabase Realtime from the client.
 *
 * WHY THIS EXCEPTION IS ACCEPTABLE:
 * 1. READ-ONLY: Only listens for changes, never reads or writes data
 * 2. CACHE INVALIDATION ONLY: Triggers API-based refetches via React Query
 * 3. REALTIME REQUIREMENT: WebSocket subscriptions are impractical to proxy through API routes
 * 4. NO DATA ACCESS: The actual data fetching still goes through proper API routes
 *
 * This ensures real-time UI updates when permissions change while maintaining
 * security through API-layer data access.
 */
export function usePermissionSync() {
  const { user } = useAuth()

  useEffect(() => {
    console.log('[PermissionSync] Hook called, user:', user?.id || 'no user')
    if (!user) return

    const supabase = createClient()
    if (!supabase) return

    console.log('[PermissionSync] Setting up permission change listener for user:', user.id)

    // Subscribe to permission changes for this user
    // This will detect when permissions are granted/revoked/updated for this user
    const channel = supabase
      .channel(`permissions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'permissions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[PermissionSync] Permission change detected for user:', payload)

          // Invalidate relevant queries when permissions change
          // This will cause React Query to refetch the data

          // Invalidate the main views
          invalidateQueries(['folders-view'])
          invalidateQueries(['notebook-view'])

          // Also invalidate specific resource queries if we know the resource
          const newRecord = payload.new as Record<string, unknown>
          const oldRecord = payload.old as Record<string, unknown>

          if (newRecord?.resource_id && typeof newRecord.resource_id === 'string') {
            invalidateQueries(['folder-detail', newRecord.resource_id])
            invalidateQueries(['notebook-view', newRecord.resource_id])
          }
          if (oldRecord?.resource_id && typeof oldRecord.resource_id === 'string') {
            invalidateQueries(['folder-detail', oldRecord.resource_id])
            invalidateQueries(['notebook-view', oldRecord.resource_id])
          }

          console.log(
            '[PermissionSync] Invalidated queries for resource:',
            newRecord?.resource_id || oldRecord?.resource_id
          )
        }
      )
      .subscribe((status, error) => {
        console.log('[PermissionSync] Subscription status:', status, 'Error:', error)
        if (status === 'SUBSCRIBED') {
          console.log('[PermissionSync] ✅ Successfully subscribed to permission changes')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[PermissionSync] ❌ Failed to subscribe:', error)
        }
      })

    return () => {
      console.log('[PermissionSync] Cleaning up permission listener')
      supabase.removeChannel(channel)
    }
  }, [user])
}
