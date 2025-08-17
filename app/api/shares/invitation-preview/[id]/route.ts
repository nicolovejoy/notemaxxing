import { NextRequest, NextResponse } from 'next/server'
import { getPublicSupabaseClient } from '@/lib/api/supabase-server-helpers'

// Public endpoint - returns minimal invitation info for unauthenticated users
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client: supabase, error } = await getPublicSupabaseClient()
    if (error) return error
    if (!supabase) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    const { id: invitationId } = await params
    console.log('[Invitation Preview] Looking for invitation:', invitationId)

    // Query public invitation preview (no auth needed, no RLS)
    const { data: preview, error: previewError } = await supabase
      .from('public_invitation_previews')
      .select('resource_type, resource_name, permission_level, expires_at, status')
      .eq('id', invitationId)
      .single()

    if (previewError || !preview) {
      console.error('[Invitation Preview] Error:', previewError)
      return NextResponse.json({ valid: false, error: 'Invitation not found' }, { status: 404 })
    }

    // Check if invitation has expired
    if (new Date(preview.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'This invitation has expired' },
        { status: 410 }
      )
    }

    // Check if already accepted
    if (preview.status === 'accepted') {
      return NextResponse.json(
        { valid: false, error: 'This invitation has already been accepted' },
        { status: 409 }
      )
    }

    // Resource name is already in the public preview
    // No need to fetch it again

    // Return minimal, safe information from public preview
    return NextResponse.json({
      valid: true,
      resourceType: preview.resource_type,
      resourceName: preview.resource_name,
      permissionLevel: preview.permission_level,
      expiresAt: preview.expires_at,
      // Note: No emails exposed in public preview
    })
  } catch (error) {
    console.error('Unexpected error in invitation preview:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
