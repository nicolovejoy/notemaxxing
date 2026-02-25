import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ notebookId: string; noteId: string }> }
) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const { notebookId, noteId } = await params
  const db = getAdminDb()

  const notebookDoc = await db.collection('notebooks').doc(notebookId).get()
  if (!notebookDoc.exists) {
    return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
  }

  const notebook = notebookDoc.data()!
  const isOwner = notebook.owner_id === uid
  let userPermission: 'owner' | 'read' | 'write' = 'owner'

  if (!isOwner) {
    if (!notebook.folder_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const permSnap = await db
      .collection('permissions')
      .where('user_id', '==', uid)
      .where('resource_id', '==', notebook.folder_id)
      .where('resource_type', '==', 'folder')
      .get()

    if (permSnap.empty) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    userPermission = permSnap.docs[0].data().permission_level as 'read' | 'write'
  }

  // Get folder name
  let folderName = ''
  if (notebook.folder_id) {
    const folderDoc = await db
      .collection('folders')
      .doc(notebook.folder_id as string)
      .get()
    if (folderDoc.exists) folderName = folderDoc.data()!.name as string
  }

  // Get the specific note
  const noteDoc = await db.collection('notes').doc(noteId).get()
  if (!noteDoc.exists || noteDoc.data()!.notebook_id !== notebookId) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  const note = noteDoc.data()!

  // Get recent notes list for navigation
  const notesSnap = await db
    .collection('notes')
    .where('notebook_id', '==', notebookId)
    .orderBy('updated_at', 'desc')
    .limit(20)
    .get()

  const notesWithPreviews = notesSnap.docs.map((doc) => {
    const n = doc.data()
    return {
      id: doc.id,
      title: n.title,
      created_at: n.created_at,
      updated_at: n.updated_at,
      preview:
        doc.id === noteId ? ((note.content as string) || '').substring(0, 150) : 'Note preview...',
    }
  })

  return NextResponse.json({
    notebook: {
      id: notebookDoc.id,
      name: notebook.name,
      color: notebook.color,
      folder_id: notebook.folder_id,
      folder_name: folderName,
      owner_id: notebook.owner_id,
      shared: !isOwner,
      permission: userPermission,
    },
    notes: notesWithPreviews,
    currentNote: {
      id: noteDoc.id,
      title: note.title,
      content: note.content,
      created_at: note.created_at,
      updated_at: note.updated_at,
    },
    pagination: {
      total: notesSnap.size,
      offset: 0,
      limit: 20,
      hasMore: false,
    },
  })
}
