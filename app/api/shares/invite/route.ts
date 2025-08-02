import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { resourceType, resourceId, invitedEmail, permission } = body

    // Validate input
    if (!resourceType || !resourceId || !invitedEmail || !permission) {
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(invitedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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

    // Check if invitation already exists
    const { data: existingInvite } = await supabase
      .from('share_invitations')
      .select('id, accepted_at')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('invited_email', invitedEmail)
      .single()

    if (existingInvite) {
      if (existingInvite.accepted_at) {
        return NextResponse.json(
          { error: 'User already has access to this resource' },
          { status: 409 }
        )
      } else {
        return NextResponse.json(
          { error: 'Invitation already sent' },
          { status: 409 }
        )
      }
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('share_invitations')
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        invited_email: invitedEmail,
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

    // TODO: Send email notification (implement later)
    // For now, we'll just return the invitation

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        resourceType: invitation.resource_type,
        resourceId: invitation.resource_id,
        invitedEmail: invitation.invited_email,
        permission: invitation.permission,
        expiresAt: invitation.expires_at,
      }
    })

  } catch (error) {
    console.error('Unexpected error in share invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}