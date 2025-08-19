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

    // 4. Get all permissions with resource details
    const { data: permissions, error: permError } = await serviceClient
      .from('permissions')
      .select('*')
      .order('granted_at', { ascending: false })

    if (permError) {
      console.error('Error fetching permissions:', permError)
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
    }

    // 5. Get invitations that are pending (not accepted yet)
    const { data: invitations, error: invError } = await serviceClient
      .from('invitations')
      .select('*')
      .is('accepted_at', null) // Not yet accepted
      .gt('expires_at', new Date().toISOString()) // Not expired
      .order('created_at', { ascending: false })

    if (invError) {
      console.error('Error fetching invitations:', invError)
    }

    // 6. Get user emails for better display
    const userIds = new Set<string>()
    permissions?.forEach(perm => {
      userIds.add(perm.user_id)
      userIds.add(perm.granted_by)
    })
    invitations?.forEach(inv => {
      userIds.add(inv.invited_by)
    })

    // Get user emails using auth.admin API
    const { data: authData } = await serviceClient.auth.admin.listUsers()
    const userMap = new Map<string, string>()
    authData?.users.forEach(user => {
      userMap.set(user.id, user.email || 'Unknown')
    })

    // 7. Get resource names for better display
    const folderIds = new Set<string>()
    const notebookIds = new Set<string>()
    
    permissions?.forEach(perm => {
      if (perm.resource_type === 'folder') {
        folderIds.add(perm.resource_id)
      } else if (perm.resource_type === 'notebook') {
        notebookIds.add(perm.resource_id)
      }
    })
    
    // Also add resource IDs from invitations
    invitations?.forEach(inv => {
      if (inv.resource_type === 'folder') {
        folderIds.add(inv.resource_id)
      } else if (inv.resource_type === 'notebook') {
        notebookIds.add(inv.resource_id)
      }
    })

    // Fetch folder names
    const folderMap = new Map<string, string>()
    if (folderIds.size > 0) {
      const { data: folders } = await serviceClient
        .from('folders')
        .select('id, name')
        .in('id', Array.from(folderIds))
      
      folders?.forEach(folder => {
        folderMap.set(folder.id, folder.name)
      })
    }

    // Fetch notebook names
    const notebookMap = new Map<string, string>()
    if (notebookIds.size > 0) {
      const { data: notebooks } = await serviceClient
        .from('notebooks')
        .select('id, name')
        .in('id', Array.from(notebookIds))
      
      notebooks?.forEach(notebook => {
        notebookMap.set(notebook.id, notebook.name)
      })
    }

    // 8. Enrich permissions with user emails and resource names
    const enrichedPermissions = permissions?.map(perm => ({
      ...perm,
      user_email: userMap.get(perm.user_id) || perm.user_id,
      granted_by_email: userMap.get(perm.granted_by) || perm.granted_by,
      resource_name: perm.resource_type === 'folder' 
        ? folderMap.get(perm.resource_id) || 'Unknown Folder'
        : notebookMap.get(perm.resource_id) || 'Unknown Notebook',
    }))

    // 9. Enrich invitations
    const enrichedInvitations = invitations?.map(inv => ({
      ...inv,
      invited_by_email: userMap.get(inv.invited_by) || inv.invited_by,
      resource_name: inv.resource_type === 'folder'
        ? folderMap.get(inv.resource_id) || 'Unknown Folder'
        : notebookMap.get(inv.resource_id) || 'Unknown Notebook',
    }))

    return NextResponse.json({
      permissions: enrichedPermissions || [],
      invitations: enrichedInvitations || [],
      stats: {
        total_permissions: permissions?.length || 0,
        total_folders_shared: folderIds.size,
        total_notebooks_shared: notebookIds.size,
        pending_invitations: invitations?.length || 0,
      }
    })
  } catch (error) {
    console.error('Admin permissions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}