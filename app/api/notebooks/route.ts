import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function GET(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const db = getAdminDb()
  const snap = await db
    .collection('notebooks')
    .where('owner_id', '==', uid)
    .orderBy('updated_at', 'desc')
    .get()

  const notebooks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return NextResponse.json(notebooks)
}

export async function POST(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const body = await request.json()
  const { name, color, folder_id } = body

  if (!name || !color || !folder_id) {
    return NextResponse.json(
      { error: 'Name, color, and folder_id are required' },
      { status: 400 }
    )
  }

  const db = getAdminDb()
  const folderDoc = await db.collection('folders').doc(folder_id).get()

  if (!folderDoc.exists) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
  }

  const folder = folderDoc.data()!
  const now = new Date().toISOString()
  const data = {
    name,
    color,
    folder_id,
    owner_id: folder.owner_id,
    created_by: uid,
    archived: false,
    archived_at: null,
    created_at: now,
    updated_at: now,
  }

  const ref = await db.collection('notebooks').add(data)
  return NextResponse.json({ id: ref.id, ...data })
}

export async function PATCH(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Notebook ID is required' }, { status: 400 })
  }

  const db = getAdminDb()
  const notebookDoc = await db.collection('notebooks').doc(id).get()

  if (!notebookDoc.exists) {
    return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
  }

  const notebook = notebookDoc.data()!
  const isOwner = notebook.owner_id === uid

  if (!isOwner) {
    if (notebook.folder_id) {
      const permSnap = await db
        .collection('permissions')
        .where('user_id', '==', uid)
        .where('resource_id', '==', notebook.folder_id)
        .where('resource_type', '==', 'folder')
        .where('permission_level', '==', 'write')
        .get()

      if (permSnap.empty) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
  }

  const safeUpdates = { ...updates, updated_at: new Date().toISOString() }
  await db.collection('notebooks').doc(id).update(safeUpdates)
  return NextResponse.json({ id, ...notebook, ...safeUpdates })
}

export async function DELETE(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Notebook ID is required' }, { status: 400 })
  }

  const db = getAdminDb()
  const notebookDoc = await db.collection('notebooks').doc(id).get()

  if (!notebookDoc.exists || notebookDoc.data()!.owner_id !== uid) {
    return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
  }

  await db.collection('notebooks').doc(id).delete()
  return NextResponse.json({ success: true })
}
