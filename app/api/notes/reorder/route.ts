import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'
import type { Firestore } from 'firebase-admin/firestore'

async function checkWriteAccess(
  db: Firestore,
  uid: string,
  ownerId: string,
  folderId: string | null
): Promise<boolean> {
  if (ownerId === uid) return true
  if (!folderId) return false

  const permSnap = await db
    .collection('permissions')
    .where('user_id', '==', uid)
    .where('resource_id', '==', folderId)
    .where('resource_type', '==', 'folder')
    .where('permission_level', '==', 'write')
    .get()

  return !permSnap.empty
}

export async function PATCH(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const body = await request.json()
  const { id, new_position } = body

  if (!id || typeof new_position !== 'number') {
    return NextResponse.json(
      { error: 'id and new_position (number) are required' },
      { status: 400 }
    )
  }

  const db = getAdminDb()
  const noteDoc = await db.collection('notes').doc(id).get()

  if (!noteDoc.exists) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  const note = noteDoc.data()!
  const hasAccess = await checkWriteAccess(db, uid, note.owner_id, note.folder_id)

  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Access denied - write permission required' },
      { status: 403 }
    )
  }

  await db.collection('notes').doc(id).update({ position: new_position })
  return NextResponse.json({ id, position: new_position })
}
