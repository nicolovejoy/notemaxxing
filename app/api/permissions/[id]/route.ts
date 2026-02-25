import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'
import type { Firestore } from 'firebase-admin/firestore'

async function getResourceOwner(db: Firestore, resourceType: string, resourceId: string): Promise<string | null> {
  const collection = resourceType === 'folder' ? 'folders' : 'notebooks'
  const doc = await db.collection(collection).doc(resourceId).get()
  return doc.exists ? (doc.data()!.owner_id as string) : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const { id } = await params
  const { permission_level } = await request.json()

  if (!permission_level || !['read', 'write'].includes(permission_level)) {
    return NextResponse.json(
      { error: 'Invalid permission level. Must be "read" or "write"' },
      { status: 400 }
    )
  }

  const db = getAdminDb()
  const permDoc = await db.collection('permissions').doc(id).get()

  if (!permDoc.exists) {
    return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
  }

  const perm = permDoc.data()!
  const ownerUid = await getResourceOwner(db, perm.resource_type, perm.resource_id)

  if (ownerUid !== uid) {
    return NextResponse.json({ error: 'Only resource owners can update permissions' }, { status: 403 })
  }

  await db.collection('permissions').doc(id).update({ permission_level })
  return NextResponse.json({ id, ...perm, permission_level })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const { id } = await params
  const db = getAdminDb()
  const permDoc = await db.collection('permissions').doc(id).get()

  if (!permDoc.exists) {
    return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
  }

  const perm = permDoc.data()!
  const ownerUid = await getResourceOwner(db, perm.resource_type, perm.resource_id)

  if (ownerUid !== uid) {
    return NextResponse.json({ error: 'Only resource owners can delete permissions' }, { status: 403 })
  }

  await db.collection('permissions').doc(id).delete()
  return NextResponse.json({ success: true })
}
