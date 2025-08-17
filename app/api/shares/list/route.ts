import { NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api/supabase-server-helpers'

// Type definitions
interface PermissionItem {
  id: string
  resource_type: string
  resource_id: string
  user_id?: string
  granted_by?: string
  permission_level: string
  created_at: string
}

interface InvitationItem {
  id: string
  resource_type: string
  resource_id: string
  invited_by?: string
  invitee_email: string
  permission_level: string
  created_at: string
  expires_at: string
  accepted_at?: string | null
}

export async function GET() {
  try {
    // Get authenticated client
    const { client: supabase, user, error } = await getAuthenticatedSupabaseClient()
    if (error) return error
    if (!supabase) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    // Get user's email for pending invitations
    const userEmail = user.email?.toLowerCase()

    // Get resources shared BY the user
    const { data: sharedByUser } = await supabase
      .from('permissions')
      .select('*')
      .eq('granted_by', user.id)

    // Silently handle errors - sharing data is optional

    // Get resources shared WITH the user
    const { data: sharedWithUser } = await supabase
      .from('permissions')
      .select('*')
      .eq('user_id', user.id)

    // Silently handle errors - sharing data is optional

    // Get pending invitations for the user
    let pendingInvitations = []
    if (userEmail) {
      const { data: invitations, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitee_email', userEmail)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())

      if (!inviteError && invitations) {
        pendingInvitations = invitations
      }
    }

    // Collect all user IDs we need profiles for
    const userIds = new Set<string>()

    // Collect user IDs from permissions
    ;(sharedByUser || []).forEach((item: PermissionItem) => {
      if (item.user_id) userIds.add(item.user_id)
    })
    ;(sharedWithUser || []).forEach((item: PermissionItem) => {
      if (item.granted_by) userIds.add(item.granted_by)
    })
    ;(pendingInvitations || []).forEach((item: InvitationItem) => {
      if (item.invited_by) userIds.add(item.invited_by)
    })

    // TODO: Create a database function to get user emails from auth.users
    // For now, we'll show the last 8 digits of the user ID
    const userProfiles: Record<string, { email: string; full_name: string | null }> = {}
    if (userIds.size > 0) {
      // Since we can't access auth.users directly and don't have a profiles table,
      // we'll use the user ID as a temporary display value
      userIds.forEach((userId) => {
        // Show last 8 characters of UUID for identification
        const shortId = userId.slice(-8)
        userProfiles[userId] = {
          email: `User ...${shortId}`, // Temporary until we add user email lookup
          full_name: null,
        }
      })
    }

    // Get resource details for all shared items
    const folderIds = new Set<string>()
    const notebookIds = new Set<string>()

    // Collect all resource IDs
    ;[...(sharedByUser || []), ...(sharedWithUser || []), ...(pendingInvitations || [])].forEach(
      (item) => {
        if (item.resource_type === 'folder') {
          folderIds.add(item.resource_id)
        } else if (item.resource_type === 'notebook') {
          notebookIds.add(item.resource_id)
        }
      }
    )

    // Fetch folder details
    const folderDetails: Record<string, { id: string; name: string; color: string }> = {}
    if (folderIds.size > 0) {
      const { data: folders } = await supabase
        .from('folders')
        .select('id, name, color')
        .in('id', Array.from(folderIds))

      if (folders) {
        folders.forEach((folder: { id: string; name: string; color: string }) => {
          folderDetails[folder.id] = folder
        })
      }
    }

    // Fetch notebook details
    const notebookDetails: Record<
      string,
      { id: string; name: string; color: string; folder_id: string }
    > = {}
    if (notebookIds.size > 0) {
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id, name, color, folder_id')
        .in('id', Array.from(notebookIds))

      if (notebooks) {
        notebooks.forEach(
          (notebook: { id: string; name: string; color: string; folder_id: string }) => {
            notebookDetails[notebook.id] = notebook
          }
        )
      }
    }

    // Format response

    const formatSharedItem = (item: PermissionItem, type: 'shared_by' | 'shared_with') => {
      const resource =
        item.resource_type === 'folder'
          ? folderDetails[item.resource_id]
          : notebookDetails[item.resource_id]

      return {
        id: item.id,
        type: type,
        resourceType: item.resource_type,
        resourceId: item.resource_id,
        resourceName: resource?.name || 'Unknown',
        resourceColor: resource?.color || '',
        permission: item.permission_level,
        user:
          type === 'shared_by'
            ? {
                id: item.user_id || '',
                email: userProfiles[item.user_id || '']?.email || '',
                name: userProfiles[item.user_id || '']?.full_name || '',
              }
            : {
                id: item.granted_by || '',
                email: userProfiles[item.granted_by || '']?.email || '',
                name: userProfiles[item.granted_by || '']?.full_name || '',
              },
        createdAt: item.created_at,
      }
    }

    const formatInvitation = (invitation: InvitationItem) => {
      const resource =
        invitation.resource_type === 'folder'
          ? folderDetails[invitation.resource_id]
          : notebookDetails[invitation.resource_id]

      return {
        id: invitation.id,
        type: 'pending_invitation',
        resourceType: invitation.resource_type,
        resourceId: invitation.resource_id,
        resourceName: resource?.name || 'Unknown',
        resourceColor: resource?.color || '',
        permission: invitation.permission_level,
        invitedBy: {
          email: userProfiles[invitation.invited_by || '']?.email || '',
          name: userProfiles[invitation.invited_by || '']?.full_name || '',
        },
        createdAt: invitation.created_at,
        expiresAt: invitation.expires_at,
      }
    }

    return NextResponse.json({
      sharedByMe: (sharedByUser || []).map((item: PermissionItem) =>
        formatSharedItem(item, 'shared_by')
      ),
      sharedWithMe: (sharedWithUser || []).map((item: PermissionItem) =>
        formatSharedItem(item, 'shared_with')
      ),
      pendingInvitations: pendingInvitations.map(formatInvitation),
    })
  } catch (error) {
    console.error('Unexpected error in list shares:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
