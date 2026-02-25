import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function POST(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const body = await request.json()
  const { invitationId } = body

  if (!invitationId) {
    return NextResponse.json({ error: 'Missing invitation ID' }, { status: 400 })
  }

  const db = getAdminDb()

  const invSnap = await db
    .collection('invitations')
    .where('token', '==', invitationId)
    .where('accepted_at', '==', null)
    .limit(1)
    .get()

  if (invSnap.empty) {
    return NextResponse.json({ error: 'Invitation not found or already accepted' }, { status: 404 })
  }

  const invDoc = invSnap.docs[0]
  const invitation = invDoc.data()

  if (new Date(invitation.expires_at as string) < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  // Check if user already has permission for this resource
  const existingPermSnap = await db
    .collection('permissions')
    .where('user_id', '==', uid)
    .where('resource_id', '==', invitation.resource_id)
    .limit(1)
    .get()

  if (!existingPermSnap.empty) {
    await invDoc.ref.update({ accepted_at: new Date().toISOString(), accepted_by: uid })
    const perm = existingPermSnap.docs[0]
    return NextResponse.json({
      success: true,
      message: 'You already have access to this resource',
      permission: {
        id: perm.id,
        resourceType: perm.data().resource_type,
        resourceId: perm.data().resource_id,
        permission: perm.data().permission_level,
      },
    })
  }

  // Create permission
  const now = new Date().toISOString()
  const permRef = await db.collection('permissions').add({
    user_id: uid,
    resource_id: invitation.resource_id,
    resource_type: invitation.resource_type,
    permission_level: invitation.permission_level,
    granted_by: invitation.invited_by,
    granted_at: now,
  })

  await invDoc.ref.update({ accepted_at: now, accepted_by: uid })

  // Handle ownership transfer if requested
  if (invitation.transfer_ownership_on_accept && invitation.resource_type === 'folder') {
    const folderId = invitation.resource_id as string
    await db.collection('folders').doc(folderId).update({ owner_id: uid })

    const notebooksSnap = await db.collection('notebooks').where('folder_id', '==', folderId).get()
    const nbBatch = db.batch()
    notebooksSnap.docs.forEach((doc) => nbBatch.update(doc.ref, { owner_id: uid }))
    if (!notebooksSnap.empty) await nbBatch.commit()

    const notesSnap = await db.collection('notes').where('folder_id', '==', folderId).get()
    const notesBatch = db.batch()
    notesSnap.docs.forEach((doc) => notesBatch.update(doc.ref, { owner_id: uid }))
    if (!notesSnap.empty) await notesBatch.commit()
  }

  return NextResponse.json({
    success: true,
    message: 'Invitation accepted successfully',
    permission: {
      id: permRef.id,
      resourceType: invitation.resource_type,
      resourceId: invitation.resource_id,
      permission: invitation.permission_level,
    },
  })
}
