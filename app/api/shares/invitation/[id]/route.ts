import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: invitationId } = await params

    // Get invitation details
    const { data: invitation, error } = await supabase
      .from('share_invitations')
      .select(`
        *,
        invited_by_user:profiles!share_invitations_invited_by_fkey(email)
      `)
      .eq('id', invitationId)
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      )
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

    return NextResponse.json({
      id: invitation.id,
      resourceType: invitation.resource_type,
      resourceId: invitation.resource_id,
      resourceName,
      permission: invitation.permission,
      invitedBy: invitation.invited_by_user?.email || 'Unknown user',
      expiresAt: invitation.expires_at,
    })

  } catch (error) {
    console.error('Unexpected error getting invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}