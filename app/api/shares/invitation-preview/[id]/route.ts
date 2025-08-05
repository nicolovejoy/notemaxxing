import { NextRequest, NextResponse } from 'next/server'
import { getPublicSupabaseClient } from '@/lib/api/supabase-server-helpers'

// Public endpoint - returns minimal invitation info for unauthenticated users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, error } = await getPublicSupabaseClient()
    if (error) return error
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      )
    }
    
    const { id: invitationId } = await params
    console.log('[Invitation Preview] Looking for invitation:', invitationId)
    
    // Query invitation with minimal fields
    const { data: invitation, error: inviteError } = await supabase
      .from('share_invitations')
      .select('resource_type, resource_id, invited_email, expires_at, accepted_at, invited_by')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      console.error('[Invitation Preview] Error:', inviteError)
      return NextResponse.json(
        { valid: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'This invitation has expired' },
        { status: 410 }
      )
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { valid: false, error: 'This invitation has already been accepted' },
        { status: 409 }
      )
    }

    // Get minimal resource details
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

    // Get inviter's email (not the user ID)
    let inviterEmail = 'Someone'
    if (invitation.invited_by) {
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', invitation.invited_by)
        .single()
      
      if (inviterProfile) {
        inviterEmail = inviterProfile.email
      }
    }

    // Return minimal, safe information
    return NextResponse.json({
      valid: true,
      resourceType: invitation.resource_type,
      resourceName,
      invitedBy: inviterEmail,
      requiresEmail: invitation.invited_email,
      expiresAt: invitation.expires_at
    })

  } catch (error) {
    console.error('Unexpected error in invitation preview:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}