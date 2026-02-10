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

    console.log(
      '[Accept Invitation] User:',
      user.id,
      'User email:',
      user.email,
      'accepting token:',
      invitationId
    )

    // 1. Fetch the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', invitationId)
      .is('accepted_at', null) // Not yet accepted
      .single()

    if (inviteError || !invitation) {
      console.error('[Accept Invitation] Invitation not found or error:', inviteError)
      return NextResponse.json(
        { error: 'Invitation not found or already accepted' },
        { status: 404 }
      )
    }

    // 2. Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.error('[Accept Invitation] Invitation has expired')
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
    }

    // 3. Check if user already has permission for this resource
    const { data: existingPermission } = await supabase
      .from('permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('resource_id', invitation.resource_id)
      .single()

    if (existingPermission) {
      console.log('[Accept Invitation] User already has permission for this resource')

      // Mark invitation as accepted anyway
      await supabase
        .from('invitations')
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq('id', invitation.id)

      return NextResponse.json({
        success: true,
        message: 'You already have access to this resource',
        permission: {
          id: existingPermission.id,
          resourceType: existingPermission.resource_type,
          resourceId: existingPermission.resource_id,
          permission: existingPermission.permission_level,
        },
      })
    }

    // 4. Create the permission record
    const { data: newPermission, error: permError } = await supabase
      .from('permissions')
      .insert({
        user_id: user.id,
        resource_id: invitation.resource_id,
        resource_type: invitation.resource_type,
        permission_level: invitation.permission_level,
        granted_by: invitation.invited_by,
        granted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (permError) {
      console.error('[Accept Invitation] Error creating permission:', permError)
      return NextResponse.json({ error: 'Failed to create permission' }, { status: 500 })
    }

    console.log('[Accept Invitation] Permission created:', newPermission.id)

    // 5. Mark the invitation as accepted
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('[Accept Invitation] Error updating invitation:', updateError)
      // Non-fatal: permission was created successfully
    }

    // 6. Handle transfer_ownership_on_accept if needed
    if (invitation.transfer_ownership_on_accept && invitation.resource_type === 'folder') {
      console.log('[Accept Invitation] Transferring folder ownership')

      // Update folder owner
      const { error: transferError } = await supabase
        .from('folders')
        .update({ owner_id: user.id })
        .eq('id', invitation.resource_id)

      if (transferError) {
        console.error('[Accept Invitation] Error transferring ownership:', transferError)
        // Non-fatal: permission was created successfully
      }

      // Update all notebooks in the folder to new owner
      const { error: notebooksError } = await supabase
        .from('notebooks')
        .update({ owner_id: user.id })
        .eq('folder_id', invitation.resource_id)

      if (notebooksError) {
        console.error('[Accept Invitation] Error updating notebook ownership:', notebooksError)
        // Non-fatal: folder ownership was transferred
      }

      // Update all notes in the folder to new owner
      const { error: notesError } = await supabase
        .from('notes')
        .update({ owner_id: user.id })
        .eq('folder_id', invitation.resource_id)

      if (notesError) {
        console.error('[Accept Invitation] Error updating note ownership:', notesError)
        // Non-fatal: folder and notebook ownership were transferred
      }
    }

    console.log('[Accept Invitation] Success - permission created:', newPermission.id)

    // Clear any cached data
    await fetch(`${request.nextUrl.origin}/api/views/folders`, {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      permission: {
        id: newPermission.id,
        resourceType: newPermission.resource_type,
        resourceId: newPermission.resource_id,
        permission: newPermission.permission_level,
      },
    })
  } catch (error) {
    console.error('[Accept Invitation] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
