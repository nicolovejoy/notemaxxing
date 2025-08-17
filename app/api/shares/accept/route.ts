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

    // Use the database function to accept the invitation
    const { data: acceptData, error: acceptError } = await supabase.rpc('accept_invitation', {
      p_token: invitationId,
    })

    console.log('[Accept Invitation] RPC result:', { acceptData, error: acceptError })

    if (acceptError) {
      console.error(
        '[Accept Invitation] RPC Error details:',
        acceptError.message,
        acceptError.details,
        acceptError.hint
      )
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    }

    // Check if the invitation was actually accepted (function returns boolean)
    if (acceptData === false) {
      console.error(
        '[Accept Invitation] Function returned false - invitation not found, expired, or already accepted'
      )
      return NextResponse.json(
        { error: 'Invitation not found, expired, or already accepted' },
        { status: 400 }
      )
    }

    // Get the invitation details to find the resource
    const { data: invitation } = await supabase
      .from('invitations')
      .select('resource_id, resource_type, permission_level')
      .eq('token', invitationId)
      .single()

    console.log('[Accept Invitation] Found invitation details:', invitation)

    // Get the actual permission that was created
    const { data: permission } = await supabase
      .from('permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('resource_id', invitation?.resource_id)
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
