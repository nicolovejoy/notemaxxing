import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const { folderId } = await params
  const db = getAdminDb()

  const folderDoc = await db.collection('folders').doc(folderId).get()
  if (!folderDoc.exists) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
  }

  const folder = folderDoc.data()!
  const isOwner = folder.owner_id === uid
  let userPermission: 'owner' | 'read' | 'write' = 'owner'

  if (!isOwner) {
    const permSnap = await db
      .collection('permissions')
      .where('resource_id', '==', folderId)
      .where('resource_type', '==', 'folder')
      .where('user_id', '==', uid)
      .get()

    if (permSnap.empty) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    userPermission = permSnap.docs[0].data().permission_level as 'read' | 'write'
  }

  // Check if owner has shared this folder with others
  let isSharedByOwner = false
  if (isOwner) {
    const sharesSnap = await db
      .collection('permissions')
      .where('resource_id', '==', folderId)
      .where('resource_type', '==', 'folder')
      .where('granted_by', '==', uid)
      .limit(1)
      .get()
    isSharedByOwner = !sharesSnap.empty
  }

  // Get notebooks in this folder
  const notebooksSnap = await db
    .collection('notebooks')
    .where('folder_id', '==', folderId)
    .orderBy('created_at', 'desc')
    .get()

  const notebooks = notebooksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const notebookIds = notebooks.map((n) => n.id)

  // Get note counts
  const noteCountMap: Record<string, number> = {}
  if (notebookIds.length > 0) {
    const notesSnap = await db.collection('notes').where('notebook_id', 'in', notebookIds).get()
    notesSnap.docs.forEach((doc) => {
      const nb_id = doc.data().notebook_id as string
      noteCountMap[nb_id] = (noteCountMap[nb_id] || 0) + 1
    })
  }

  // Check per-notebook sharing (for owners)
  const sharedNotebookIds: Set<string> = new Set()
  if (isOwner && notebookIds.length > 0) {
    const nbSharesSnap = await db
      .collection('permissions')
      .where('resource_type', '==', 'notebook')
      .where('granted_by', '==', uid)
      .get()
    nbSharesSnap.docs.forEach((doc) => sharedNotebookIds.add(doc.data().resource_id as string))
  }

  const notebooksWithDetails = notebooks.map((nb) => ({
    ...nb,
    note_count: noteCountMap[nb.id] || 0,
    shared_by_owner: sharedNotebookIds.has(nb.id),
  }))

  return NextResponse.json({
    folder: {
      id: folderDoc.id,
      ...folder,
      shared: !isOwner,
      sharedByOwner: isSharedByOwner,
      permission: userPermission,
    },
    notebooks: notebooksWithDetails,
    userPermission,
  })
}
