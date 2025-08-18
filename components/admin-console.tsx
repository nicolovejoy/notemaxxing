/**
 * Admin Console Component
 * 
 * TODO: COMPLETE REWRITE NEEDED
 * This component is currently disabled because it violates our architecture patterns:
 * 
 * ISSUES:
 * 1. Makes direct Supabase calls instead of using API routes
 * 2. Calls non-existent RPC functions (get_all_users_admin, create_starter_content_for_specific_user, delete_user_admin)
 * 3. Tries to access auth.users table directly (not allowed from client)
 * 4. Doesn't use React Query for data fetching
 * 5. Doesn't follow ViewStore pattern
 * 
 * PROPER IMPLEMENTATION (TODO):
 * 1. Create admin API routes:
 *    - /api/admin/users - GET all users
 *    - /api/admin/users/[id] - DELETE user, POST seed content
 *    - /api/admin/permissions - GET all permissions with enriched data
 *    - /api/admin/stats - GET system-wide statistics
 * 
 * 2. Use React Query hooks:
 *    - useAdminUsers()
 *    - useAdminPermissions()
 *    - useAdminStats()
 * 
 * 3. Server-side admin authorization
 * 4. No direct Supabase calls in component
 * 
 * For now, this component is disabled to allow deployment.
 */

'use client'

import { Modal } from './ui/Modal'
import { StatusMessage } from './ui/StatusMessage'

interface AdminConsoleProps {
  onClose: () => void
}

export function AdminConsole({ onClose }: AdminConsoleProps) {
  return (
    <Modal isOpen onClose={onClose} title="Admin Console">
      <div className="p-6">
        <StatusMessage 
          type="info" 
          message="Admin console is temporarily disabled for maintenance. It needs to be rebuilt to use proper API routes instead of direct database access."
        />
        <div className="mt-4 text-sm text-gray-600">
          <p className="font-semibold mb-2">Planned improvements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Secure server-side API routes for admin functions</li>
            <li>React Query integration for data fetching</li>
            <li>Proper authorization checks</li>
            <li>Real-time updates via subscriptions</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}