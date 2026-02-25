import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function POST(request: NextRequest) {
  const { uid, email: callerEmail, error } = await getAuthenticatedUser(request)
  if (error) return error

  const body = await request.json()
  const { resourceType, resourceId, permission, email } = body

  if (!resourceType || !resourceId || !permission || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  if (callerEmail && callerEmail.toLowerCase() === email.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot share with yourself' }, { status: 400 })
  }

  if (!['folder', 'notebook'].includes(resourceType)) {
    return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 })
  }

  if (!['read', 'write'].includes(permission)) {
    return NextResponse.json({ error: 'Invalid permission level' }, { status: 400 })
  }

  const db = getAdminDb()

  // Verify ownership
  const collection = resourceType === 'folder' ? 'folders' : 'notebooks'
  const resourceDoc = await db.collection(collection).doc(resourceId).get()
  if (!resourceDoc.exists || resourceDoc.data()!.owner_id !== uid) {
    return NextResponse.json({ error: 'Resource not found or unauthorized' }, { status: 403 })
  }

  const resourceName = resourceDoc.data()!.name as string
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Check for existing pending invitation
  const existingSnap = await db
    .collection('invitations')
    .where('resource_id', '==', resourceId)
    .where('invitee_email', '==', email.toLowerCase())
    .where('accepted_at', '==', null)
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0]
    await existingDoc.ref.update({ expires_at: newExpiry })

    await db.collection('invitationPreviews').doc(existingDoc.data().token as string).set({
      token: existingDoc.data().token,
      resource_name: resourceName,
      resource_type: resourceType,
      inviter_name: callerEmail || 'A user',
      expires_at: newExpiry,
    })

    return NextResponse.json({
      success: true,
      invitationId: existingDoc.data().token,
      expiresAt: newExpiry,
      existing: true,
    })
  }

  // Create new invitation
  const token = crypto.randomUUID()
  await db.collection('invitations').add({
    token,
    resource_id: resourceId,
    resource_type: resourceType,
    permission_level: permission,
    invitee_email: email.toLowerCase(),
    invited_by: uid,
    expires_at: newExpiry,
    created_at: new Date().toISOString(),
    accepted_at: null,
    accepted_by: null,
    transfer_ownership_on_accept: false,
  })

  await db.collection('invitationPreviews').doc(token).set({
    token,
    resource_name: resourceName,
    resource_type: resourceType,
    inviter_name: callerEmail || 'A user',
    expires_at: newExpiry,
  })

  return NextResponse.json({ success: true, invitationId: token, expiresAt: newExpiry })
}
