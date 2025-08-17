import { NextRequest, NextResponse } from 'next/server'
import { getPublicSupabaseClient } from '@/lib/api/supabase-server-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client: supabase, error } = await getPublicSupabaseClient()
    if (error) return error
    if (!supabase) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    const { id: invitationId } = await params
    console.log('[Get Invitation] Looking for invitation:', invitationId)

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('share_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      console.error('[Get Invitation] Error or not found:', inviteError)
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 409 }
      )
    }

    // Get resource details
    let resourceName = ''
    if (invitation.resource_type === 'folder') {
      const { data: folder } = await supabase
        .from('folders')
        .select('name')
        .eq('id', invitation.resource_id)
        .single()

      resourceName = folder?.name || 'Unnamed folder'
    } else {
      const { data: notebook } = await supabase
        .from('notebooks')
        .select('name')
        .eq('id', invitation.resource_id)
        .single()

      resourceName = notebook?.name || 'Unnamed notebook'
    }

    // TODO: Add profiles table or database function to get user emails
    // For now, show last 8 digits of inviter's ID
    let inviterEmail = 'Unknown user'
    if (invitation.invited_by) {
      // Show last 8 characters of UUID for identification
      const shortId = invitation.invited_by.slice(-8)
      inviterEmail = `User ...${shortId}`
    }

    return NextResponse.json({
      id: invitation.id,
      resourceType: invitation.resource_type,
      resourceId: invitation.resource_id,
      resourceName,
      permission: invitation.permission,
      invitedBy: inviterEmail,
      invitedEmail: invitation.invited_email,
      expiresAt: invitation.expires_at,
    })
  } catch (error) {
    console.error('Unexpected error getting invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
