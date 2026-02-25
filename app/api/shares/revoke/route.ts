import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

async function handleRevoke(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const body = await request.json()
  const { permissionId } = body

  if (!permissionId) {
    return NextResponse.json({ error: 'Missing permission ID' }, { status: 400 })
  }

  const db = getAdminDb()
  const permDoc = await db.collection('permissions').doc(permissionId).get()

  if (!permDoc.exists) {
    return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
  }

  const perm = permDoc.data()!
  const collection = perm.resource_type === 'folder' ? 'folders' : 'notebooks'
  const resourceDoc = await db
    .collection(collection)
    .doc(perm.resource_id as string)
    .get()

  if (!resourceDoc.exists || resourceDoc.data()!.owner_id !== uid) {
    return NextResponse.json(
      { error: 'You are not authorized to revoke this permission' },
      { status: 403 }
    )
  }

  await permDoc.ref.delete()

  return NextResponse.json({
    success: true,
    message: 'Permission revoked successfully',
    revokedPermission: {
      resourceType: perm.resource_type,
      resourceId: perm.resource_id,
      userId: perm.user_id,
    },
  })
}

export async function POST(request: NextRequest) {
  return handleRevoke(request)
}

export async function DELETE(request: NextRequest) {
  return handleRevoke(request)
}
