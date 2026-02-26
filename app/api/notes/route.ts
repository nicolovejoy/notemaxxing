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

export async function POST(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  try {
    const body = await request.json()
    const { title, content, notebook_id } = body

    if (!notebook_id) {
      return NextResponse.json({ error: 'Notebook ID is required' }, { status: 400 })
    }

    const db = getAdminDb()
    const notebookDoc = await db.collection('notebooks').doc(notebook_id).get()

    if (!notebookDoc.exists) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    const notebook = notebookDoc.data()!
    const hasAccess = await checkWriteAccess(db, uid, notebook.owner_id, notebook.folder_id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied - write permission required' },
        { status: 403 }
      )
    }

    // Assign position: find max position in notebook, add 1000
    // Use select('position') without orderBy to avoid composite index requirement
    const existingNotes = await db
      .collection('notes')
      .where('notebook_id', '==', notebook_id)
      .select('position')
      .get()

    let position = 1000
    if (!existingNotes.empty) {
      let maxPos = 0
      existingNotes.docs.forEach((doc) => {
        const pos = doc.data().position
        if (typeof pos === 'number' && pos > maxPos) {
          maxPos = pos
        }
      })
      if (maxPos > 0) {
        position = maxPos + 1000
      }
    }

    const now = new Date().toISOString()
    const data = {
      title: title || 'Untitled Note',
      content: content || '',
      notebook_id,
      folder_id: notebook.folder_id,
      owner_id: notebook.owner_id,
      created_by: uid,
      created_at: now,
      updated_at: now,
      position,
    }

    const ref = await db.collection('notes').add(data)
    return NextResponse.json({ id: ref.id, ...data })
  } catch (err) {
    console.error('Error creating note:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create note' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  try {
    const body = await request.json()
    const { id, title, content, position } = body

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
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

    const updates: Record<string, string | number> = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    if (typeof position === 'number') updates.position = position

    await db.collection('notes').doc(id).update(updates)
    return NextResponse.json({ id, ...note, ...updates })
  } catch (err) {
    console.error('Error updating note:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update note' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
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

    await db.collection('notes').doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting note:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete note' },
      { status: 500 }
    )
  }
}
