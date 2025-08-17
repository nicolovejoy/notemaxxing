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

    console.log('[Accept Invitation] User:', user.id, 'accepting invitation:', invitationId)

    // Use the database function to accept the invitation
    const { error: acceptError } = await supabase.rpc('accept_invitation', {
      p_invitation_id: invitationId,
      p_user_id: user.id,
    })

    if (acceptError) {
      console.error('[Accept Invitation] Error:', acceptError)

      // Parse specific error messages from the function
      if (acceptError.message.includes('not found or not for this user')) {
        return NextResponse.json({ error: 'Invitation not found or not for you' }, { status: 403 })
      }
      if (acceptError.message.includes('already accepted')) {
        return NextResponse.json({ error: 'Invitation already accepted' }, { status: 409 })
      }
      if (acceptError.message.includes('expired')) {
        return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
      }

      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    }

    // Get the resource details for the response
    const { data: details } = await supabase
      .from('invitation_details')
      .select(
        'resource_id, resource_type: public_store.invitation_previews(resource_type, resource_name)'
      )
      .eq('id', invitationId)
      .single()

    // Get the actual permission that was created
    const { data: permission } = await supabase
      .from('permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('resource_id', details?.resource_id)
      .single()

    console.log('[Accept Invitation] Success - permission created:', permission?.id)

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
      permission: permission
        ? {
            id: permission.id,
            resourceType: permission.resource_type,
            resourceId: permission.resource_id,
            permission: permission.permission_level,
          }
        : null,
    })
  } catch (error) {
    console.error('[Accept Invitation] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
