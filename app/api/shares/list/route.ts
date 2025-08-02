import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's email for pending invitations
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    // Get resources shared BY the user
    const { data: sharedByUser, error: sharedByError } = await supabase
      .from('permissions')
      .select(`
        id,
        resource_type,
        resource_id,
        user_id,
        permission,
        created_at,
        profiles!permissions_user_id_fkey (
          email,
          full_name
        )
      `)
      .eq('granted_by', user.id)

    if (sharedByError) {
      console.error('Error fetching shared by user:', sharedByError)
    }

    // Get resources shared WITH the user
    const { data: sharedWithUser, error: sharedWithError } = await supabase
      .from('permissions')
      .select(`
        id,
        resource_type,
        resource_id,
        permission,
        created_at,
        granted_by,
        profiles!permissions_granted_by_fkey (
          email,
          full_name
        )
      `)
      .eq('user_id', user.id)

    if (sharedWithError) {
      console.error('Error fetching shared with user:', sharedWithError)
    }

    // Get pending invitations for the user
    let pendingInvitations = []
    if (profile?.email) {
      const { data: invitations, error: inviteError } = await supabase
        .from('share_invitations')
        .select(`
          id,
          resource_type,
          resource_id,
          permission,
          created_at,
          expires_at,
          profiles!share_invitations_invited_by_fkey (
            email,
            full_name
          )
        `)
        .eq('invited_email', profile.email)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())

      if (!inviteError && invitations) {
        pendingInvitations = invitations
      }
    }

    // Get resource details for all shared items
    const folderIds = new Set<string>()
    const notebookIds = new Set<string>()

    // Collect all resource IDs
    ;[...(sharedByUser || []), ...(sharedWithUser || []), ...(pendingInvitations || [])]
      .forEach(item => {
        if (item.resource_type === 'folder') {
          folderIds.add(item.resource_id)
        } else if (item.resource_type === 'notebook') {
          notebookIds.add(item.resource_id)
        }
      })

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
    const notebookDetails: Record<string, { id: string; name: string; color: string; folder_id: string }> = {}
    if (notebookIds.size > 0) {
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id, name, color, folder_id')
        .in('id', Array.from(notebookIds))

      if (notebooks) {
        notebooks.forEach((notebook: { id: string; name: string; color: string; folder_id: string }) => {
          notebookDetails[notebook.id] = notebook
        })
      }
    }

    // Format response
    interface SharedItem {
      id: string
      resource_type: string
      resource_id: string
      user_id?: string
      granted_by?: string
      permission: string
      created_at: string
      profiles?: {
        email?: string
        full_name?: string | null
      }
    }

    interface InvitationItem {
      id: string
      resource_type: string
      resource_id: string
      permission: string
      created_at: string
      expires_at: string
      profiles?: {
        email?: string
        full_name?: string | null
      }
    }

    const formatSharedItem = (item: SharedItem, type: 'shared_by' | 'shared_with') => {
      const resource = item.resource_type === 'folder' 
        ? folderDetails[item.resource_id]
        : notebookDetails[item.resource_id]

      return {
        id: item.id,
        type: type,
        resourceType: item.resource_type,
        resourceId: item.resource_id,
        resourceName: resource?.name || 'Unknown',
        resourceColor: resource?.color || '',
        permission: item.permission,
        user: type === 'shared_by' 
          ? {
              id: item.user_id,
              email: item.profiles?.email || '',
              name: item.profiles?.full_name || ''
            }
          : {
              id: item.granted_by,
              email: item.profiles?.email || '',
              name: item.profiles?.full_name || ''
            },
        createdAt: item.created_at
      }
    }

    const formatInvitation = (invitation: InvitationItem) => {
      const resource = invitation.resource_type === 'folder' 
        ? folderDetails[invitation.resource_id]
        : notebookDetails[invitation.resource_id]

      return {
        id: invitation.id,
        type: 'pending_invitation',
        resourceType: invitation.resource_type,
        resourceId: invitation.resource_id,
        resourceName: resource?.name || 'Unknown',
        resourceColor: resource?.color || '',
        permission: invitation.permission,
        invitedBy: {
          email: invitation.profiles?.email || '',
          name: invitation.profiles?.full_name || ''
        },
        createdAt: invitation.created_at,
        expiresAt: invitation.expires_at
      }
    }

    return NextResponse.json({
      sharedByMe: (sharedByUser || []).map((item: SharedItem) => formatSharedItem(item, 'shared_by')),
      sharedWithMe: (sharedWithUser || []).map((item: SharedItem) => formatSharedItem(item, 'shared_with')),
      pendingInvitations: pendingInvitations.map(formatInvitation)
    })

  } catch (error) {
    console.error('Unexpected error in list shares:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}