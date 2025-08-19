import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api/supabase-server-helpers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Admin emails allowed to use this endpoint
const ADMIN_EMAILS = ['nicholas.lovejoy@gmail.com', 'mlovejoy@scu.edu']

export async function GET(_request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const { client: supabase, user, error } = await getAuthenticatedSupabaseClient()
    if (error) return error
    if (!supabase) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    // 2. Verify user is admin
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Create service role client
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 4. Get total counts
    const [
      foldersResult,
      notebooksResult,
      notesResult,
      permissionsResult,
      invitationsResult,
    ] = await Promise.all([
      serviceClient.from('folders').select('id', { count: 'exact', head: true }),
      serviceClient.from('notebooks').select('id', { count: 'exact', head: true }),
      serviceClient.from('notes').select('id', { count: 'exact', head: true }),
      serviceClient.from('permissions').select('id', { count: 'exact', head: true }),
      serviceClient.from('invitations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    // 5. Get user statistics
    const { data: authData } = await serviceClient.auth.admin.listUsers()
    const totalUsers = authData?.users.length || 0
    
    // Calculate active users (signed in within last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const activeUsers = authData?.users.filter(user => {
      if (!user.last_sign_in_at) return false
      return new Date(user.last_sign_in_at) > thirtyDaysAgo
    }).length || 0

    // 6. Get top sharers (users who have shared the most)
    const { data: topSharers } = await serviceClient
      .from('permissions')
      .select('granted_by')
      .order('granted_by')
    
    const sharerCounts = new Map<string, number>()
    topSharers?.forEach(perm => {
      sharerCounts.set(perm.granted_by, (sharerCounts.get(perm.granted_by) || 0) + 1)
    })

    // Get user emails for top sharers
    const userMap = new Map<string, string>()
    authData?.users.forEach(user => {
      userMap.set(user.id, user.email || 'Unknown')
    })

    const topSharersList = Array.from(sharerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({
        email: userMap.get(userId) || userId,
        count,
      }))

    // 7. Get most active users (by content creation)
    const { data: contentCreators } = await serviceClient
      .from('folders')
      .select('owner_id')
      .order('owner_id')
    
    const creatorCounts = new Map<string, number>()
    contentCreators?.forEach(item => {
      creatorCounts.set(item.owner_id, (creatorCounts.get(item.owner_id) || 0) + 1)
    })

    const { data: notebookCreators } = await serviceClient
      .from('notebooks')
      .select('owner_id')
    
    notebookCreators?.forEach(item => {
      creatorCounts.set(item.owner_id, (creatorCounts.get(item.owner_id) || 0) + 1)
    })

    const { data: noteCreators } = await serviceClient
      .from('notes')
      .select('owner_id')
    
    noteCreators?.forEach(item => {
      creatorCounts.set(item.owner_id, (creatorCounts.get(item.owner_id) || 0) + 1)
    })

    const topCreatorsList = Array.from(creatorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({
        email: userMap.get(userId) || userId,
        count,
      }))

    // 8. Calculate growth (users created in last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const newUsers = authData?.users.filter(user => {
      return new Date(user.created_at) > sevenDaysAgo
    }).length || 0

    return NextResponse.json({
      overview: {
        total_users: totalUsers,
        active_users_30d: activeUsers,
        new_users_7d: newUsers,
        total_folders: foldersResult.count || 0,
        total_notebooks: notebooksResult.count || 0,
        total_notes: notesResult.count || 0,
        total_permissions: permissionsResult.count || 0,
        pending_invitations: invitationsResult.count || 0,
      },
      top_sharers: topSharersList,
      top_creators: topCreatorsList,
      averages: {
        folders_per_user: totalUsers > 0 ? ((foldersResult.count || 0) / totalUsers).toFixed(1) : '0',
        notebooks_per_user: totalUsers > 0 ? ((notebooksResult.count || 0) / totalUsers).toFixed(1) : '0',
        notes_per_user: totalUsers > 0 ? ((notesResult.count || 0) / totalUsers).toFixed(1) : '0',
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}