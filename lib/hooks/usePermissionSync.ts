import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { invalidateQueries } from '@/lib/query/query-client'
import { useAuth } from './useAuth'

export function usePermissionSync() {
  const { user } = useAuth()

  useEffect(() => {
    console.log('[PermissionSync] Hook called, user:', user?.id || 'no user')
    if (!user) return

    const supabase = createClient()
    
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
          if (payload.new?.resource_id) {
            invalidateQueries(['folder-detail', payload.new.resource_id])
            invalidateQueries(['notebook-view', payload.new.resource_id])
          }
          if (payload.old?.resource_id) {
            invalidateQueries(['folder-detail', payload.old.resource_id])
            invalidateQueries(['notebook-view', payload.old.resource_id])
          }
          
          console.log('[PermissionSync] Invalidated queries for resource:', payload.new?.resource_id || payload.old?.resource_id)
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