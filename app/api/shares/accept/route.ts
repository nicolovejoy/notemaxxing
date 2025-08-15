import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api/supabase-server-helpers'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated client
    const { client: supabase, user, error } = await getAuthenticatedSupabaseClient()
    if (error) return error
    if (!supabase) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    // Parse request body
    const body = await request.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json({ error: 'Missing invitation ID' }, { status: 400 })
    }

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('share_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if invitation is for this user (skip for link-based invitations)
    if (invitation.invited_email !== 'link@share.notemaxxing') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      if (!profile || profile.email !== invitation.invited_email) {
        return NextResponse.json({ error: 'This invitation is not for you' }, { status: 403 })
      }
    }

    // Check if invitation is already accepted
    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 409 })
    }

    // Check if invitation is expired
    const expiresAt = new Date(invitation.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }

    // Check if permission already exists
    const { data: existingPermission } = await supabase
      .from('permissions')
      .select('id')
      .eq('resource_type', invitation.resource_type)
      .eq('resource_id', invitation.resource_id)
      .eq('user_id', user.id)
      .single()

    if (existingPermission) {
      // Update invitation status anyway
      await supabase
        .from('share_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitationId)

      return NextResponse.json({
        success: true,
        message: 'You already have access to this resource',
      })
    }

    // Start a transaction to ensure both operations succeed
    // Create permission
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .insert({
        resource_type: invitation.resource_type,
        resource_id: invitation.resource_id,
        user_id: user.id,
        permission: invitation.permission,
        granted_by: invitation.invited_by,
      })
      .select()
      .single()

    if (permError) {
      console.error('Error creating permission:', permError)
      return NextResponse.json({ error: 'Failed to grant permission' }, { status: 500 })
    }

    // Update invitation as accepted
    const { error: updateError } = await supabase
      .from('share_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitationId)

    if (updateError) {
      // Try to rollback permission creation
      await supabase.from('permissions').delete().eq('id', permission.id)

      console.error('Error updating invitation:', updateError)
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    }

    // Get resource details for response
    let resourceDetails
    if (invitation.resource_type === 'folder') {
      const { data } = await supabase
        .from('folders')
        .select('name, color')
        .eq('id', invitation.resource_id)
        .single()
      resourceDetails = data
    } else {
      const { data } = await supabase
        .from('notebooks')
        .select('name, color')
        .eq('id', invitation.resource_id)
        .single()
      resourceDetails = data
    }

    return NextResponse.json({
      success: true,
      permission: {
        id: permission.id,
        resourceType: permission.resource_type,
        resourceId: permission.resource_id,
        permission: permission.permission,
        resourceName: resourceDetails?.name,
        resourceColor: resourceDetails?.color,
      },
    })
  } catch (error) {
    console.error('Unexpected error in accept invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
