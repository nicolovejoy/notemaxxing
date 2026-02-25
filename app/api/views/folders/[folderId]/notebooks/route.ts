import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const { folderId } = await params
  const searchParams = request.nextUrl.searchParams
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = parseInt(searchParams.get('limit') || '20')

  const db = getAdminDb()

  // Get folder and verify access
  const folderDoc = await db.collection('folders').doc(folderId).get()
  if (!folderDoc.exists) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
  }

  const folder = folderDoc.data()!
  const isOwner = folder.owner_id === uid

  if (!isOwner) {
    const permSnap = await db
      .collection('permissions')
      .where('user_id', '==', uid)
      .where('resource_id', '==', folderId)
      .where('resource_type', '==', 'folder')
      .get()
    if (permSnap.empty) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }
  }

  // Get all notebooks for this folder (sorted by updated_at desc)
  const notebooksSnap = await db
    .collection('notebooks')
    .where('folder_id', '==', folderId)
    .orderBy('updated_at', 'desc')
    .get()

  const allNotebooks = notebooksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  const totalCount = allNotebooks.length
  const notebooks = allNotebooks.slice(offset, offset + limit)

  return NextResponse.json({
    folder: { id: folderDoc.id, name: folder.name, color: folder.color },
    notebooks,
    pagination: {
      total: totalCount,
      offset,
      limit,
      hasMore: offset + limit < totalCount,
    },
  })
}
