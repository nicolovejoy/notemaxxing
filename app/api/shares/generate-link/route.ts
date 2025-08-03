import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api/supabase-server-helpers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated client
    const { client: supabase, user, error } = await getAuthenticatedSupabaseClient()
    if (error) return error

    // Parse request body
    const body = await request.json()
    const { resourceType, resourceId, permission } = body

    // Validate input
    if (!resourceType || !resourceId || !permission) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['folder', 'notebook'].includes(resourceType)) {
      return NextResponse.json(
        { error: 'Invalid resource type' },
        { status: 400 }
      )
    }

    if (!['read', 'write'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission level' },
        { status: 400 }
      )
    }

    // Check if user owns the resource
    if (resourceType === 'folder') {
      const { data, error } = await supabase
        .from('folders')
        .select('id')
        .eq('id', resourceId)
        .eq('user_id', user.id)
        .single()
      
      if (error || !data) {
        return NextResponse.json(
          { error: 'Resource not found or unauthorized' },
          { status: 403 }
        )
      }
    } else {
      const { data, error } = await supabase
        .from('notebooks')
        .select('id')
        .eq('id', resourceId)
        .eq('user_id', user.id)
        .single()
      
      if (error || !data) {
        return NextResponse.json(
          { error: 'Resource not found or unauthorized' },
          { status: 403 }
        )
      }
    }

    // Generate a unique invitation ID that will be used in the share link
    const invitationId = uuidv4()

    // Create invitation with no email - this will be a link-based invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('share_invitations')
      .insert({
        id: invitationId,
        resource_type: resourceType,
        resource_id: resourceId,
        invited_email: 'link@share.notemaxxing', // Placeholder for link-based shares
        permission: permission,
        invited_by: user.id,
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      expiresAt: invitation.expires_at,
    })

  } catch (error) {
    console.error('Unexpected error in generate share link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}