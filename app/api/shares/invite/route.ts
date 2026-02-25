import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function POST(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const body = await request.json()
  const { resourceType, resourceId, invitedEmail, permission } = body

  if (!resourceType || !resourceId || !invitedEmail || !permission) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['folder', 'notebook'].includes(resourceType)) {
    return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 })
  }

  if (!['read', 'write'].includes(permission)) {
    return NextResponse.json({ error: 'Invalid permission level' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(invitedEmail)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  const db = getAdminDb()
  const collection = resourceType === 'folder' ? 'folders' : 'notebooks'
  const resourceDoc = await db.collection(collection).doc(resourceId).get()

  if (!resourceDoc.exists || resourceDoc.data()!.owner_id !== uid) {
    return NextResponse.json({ error: 'Resource not found or unauthorized' }, { status: 403 })
  }

  // Check if invitation already exists
  const existingSnap = await db
    .collection('invitations')
    .where('resource_type', '==', resourceType)
    .where('resource_id', '==', resourceId)
    .where('invitee_email', '==', invitedEmail)
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0].data()
    if (existing.accepted_at) {
      return NextResponse.json(
        { error: 'User already has access to this resource' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Invitation already sent' }, { status: 409 })
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const ref = await db.collection('invitations').add({
    token,
    resource_type: resourceType,
    resource_id: resourceId,
    invitee_email: invitedEmail,
    permission_level: permission,
    invited_by: uid,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    accepted_at: null,
    accepted_by: null,
    transfer_ownership_on_accept: false,
  })

  return NextResponse.json({
    success: true,
    invitation: {
      id: ref.id,
      resourceType,
      resourceId,
      invitedEmail,
      permission,
      expiresAt,
    },
  })
}
