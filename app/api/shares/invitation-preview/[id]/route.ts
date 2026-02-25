import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'

// Public endpoint — no auth required
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: token } = await params
  const db = getAdminDb()

  const doc = await db.collection('invitationPreviews').doc(token).get()

  if (!doc.exists) {
    return NextResponse.json({ valid: false, error: 'Invitation not found' }, { status: 404 })
  }

  const preview = doc.data()!

  if (new Date(preview.expires_at as string) < new Date()) {
    return NextResponse.json({ valid: false, error: 'This invitation has expired' }, { status: 410 })
  }

  return NextResponse.json({
    valid: true,
    resourceType: preview.resource_type,
    resourceName: preview.resource_name,
    invitedBy: preview.inviter_name,
    expiresAt: preview.expires_at,
  })
}
