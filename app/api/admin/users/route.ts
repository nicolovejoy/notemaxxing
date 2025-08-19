import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api/supabase-server-helpers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Admin emails allowed to use this endpoint
const ADMIN_EMAILS = ['nicholas.lovejoy@gmail.com', 'mlovejoy@scu.edu']

export async function GET(request: NextRequest) {
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

    // 3. Create service role client to access auth.users
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

    // 4. Get all users from auth.users
    const { data: authUsers, error: authError } = await serviceClient.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching users:', authError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // 5. Get stats for each user
    const usersWithStats = await Promise.all(
      authUsers.users.map(async (authUser) => {
        // Get counts for folders, notebooks, notes
        const [foldersResult, notebooksResult, notesResult, permissionsGrantedResult, permissionsReceivedResult] = await Promise.all([
          serviceClient
            .from('folders')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', authUser.id),
          serviceClient
            .from('notebooks')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', authUser.id),
          serviceClient
            .from('notes')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', authUser.id),
          serviceClient
            .from('permissions')
            .select('id', { count: 'exact', head: true })
            .eq('granted_by', authUser.id),
          serviceClient
            .from('permissions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', authUser.id),
        ])

        return {
          id: authUser.id,
          email: authUser.email || 'No email',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          is_admin: authUser.email ? ADMIN_EMAILS.includes(authUser.email) : false,
          stats: {
            folders: foldersResult.count || 0,
            notebooks: notebooksResult.count || 0,
            notes: notesResult.count || 0,
            permissions_granted: permissionsGrantedResult.count || 0,
            permissions_received: permissionsReceivedResult.count || 0,
          },
        }
      })
    )

    // 6. Sort by created_at (newest first)
    usersWithStats.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({
      users: usersWithStats,
      total: usersWithStats.length,
    })
  } catch (error) {
    console.error('Admin users list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}