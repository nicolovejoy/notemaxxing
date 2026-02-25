import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'

// Public endpoint — no auth required
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: invitationId } = await params
  const db = getAdminDb()

  // Look up invitation by token
  const invSnap = await db
    .collection('invitations')
    .where('token', '==', invitationId)
    .limit(1)
    .get()

  if (invSnap.empty) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  const invDoc = invSnap.docs[0]
  const invitation = invDoc.data()

  if (new Date(invitation.expires_at as string) < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  if (invitation.accepted_at) {
    return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 409 })
  }

  // Get resource name
  const collection = invitation.resource_type === 'folder' ? 'folders' : 'notebooks'
  const resourceDoc = await db.collection(collection).doc(invitation.resource_id as string).get()
  const resourceName = resourceDoc.exists ? (resourceDoc.data()!.name as string) : 'Unknown'

  // Get inviter email
  let inviterEmail = 'Unknown user'
  try {
    const userRecord = await getAdminAuth().getUser(invitation.invited_by as string)
    inviterEmail = userRecord.email || inviterEmail
  } catch {
    inviterEmail = `User ...${(invitation.invited_by as string).slice(-8)}`
  }

  return NextResponse.json({
    id: invDoc.id,
    resourceType: invitation.resource_type,
    resourceId: invitation.resource_id,
    resourceName,
    permission: invitation.permission_level,
    invitedBy: inviterEmail,
    invitedEmail: invitation.invitee_email,
    expiresAt: invitation.expires_at,
  })
}
