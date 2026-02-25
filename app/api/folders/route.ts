import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function POST(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const body = await request.json()
  const { name, color } = body

  if (!name || !color) {
    return NextResponse.json({ error: 'Name and color are required' }, { status: 400 })
  }

  const db = getAdminDb()
  const now = new Date().toISOString()
  const ref = await db.collection('folders').add({ name, color, owner_id: uid, created_at: now, updated_at: now })

  return NextResponse.json({ id: ref.id, name, color, owner_id: uid, created_at: now, updated_at: now })
}

export async function PATCH(request: NextRequest) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const body = await request.json()
  const { id, name, color } = body

  if (!id) {
    return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
  }

  const db = getAdminDb()
  const folderDoc = await db.collection('folders').doc(id).get()

  if (!folderDoc.exists) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
  }

  const folder = folderDoc.data()!
  if (folder.owner_id !== uid) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  const updates: Record<string, string> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (color !== undefined) updates.color = color

  await db.collection('folders').doc(id).update(updates)
  return NextResponse.json({ id, ...folder, ...updates })
}
