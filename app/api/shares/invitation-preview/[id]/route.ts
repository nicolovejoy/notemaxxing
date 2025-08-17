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

    const { id: invitationToken } = await params
    console.log('[Invitation Preview] Looking for invitation with token:', invitationToken)

    // Query public invitation preview by token (no auth needed, no RLS)
    const { data: preview, error: previewError } = await supabase
      .from('public_invitation_previews')
      .select('resource_type, resource_name, inviter_name, expires_at')
      .eq('token', invitationToken)
      .single()

    console.log('[Invitation Preview] Query result:', { preview, error: previewError })

    if (previewError || !preview) {
      console.error(
        '[Invitation Preview] Not found or error:',
        previewError?.message || 'No preview data'
      )
      return NextResponse.json({ valid: false, error: 'Invitation not found' }, { status: 404 })
    }

    // Check if invitation has expired
    if (new Date(preview.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'This invitation has expired' },
        { status: 410 }
      )
    }

    // Return minimal, safe information from public preview
    return NextResponse.json({
      valid: true,
      resourceType: preview.resource_type,
      resourceName: preview.resource_name,
      invitedBy: preview.inviter_name,
      expiresAt: preview.expires_at,
      // Note: No emails or permission levels exposed in public preview for security
    })
  } catch (error) {
    console.error('Unexpected error in invitation preview:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
