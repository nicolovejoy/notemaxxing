import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const { id } = await params
  const db = getAdminDb()

  const [notebookDoc, folderDoc] = await Promise.all([
    db.collection('notebooks').doc(id).get(),
    db.collection('folders').doc(id).get(),
  ])

  return NextResponse.json({
    queryId: id,
    currentUserId: uid,
    isNotebook: notebookDoc.exists,
    isFolder: folderDoc.exists,
    notebook: notebookDoc.exists ? { id: notebookDoc.id, ...notebookDoc.data() } : null,
    folder: folderDoc.exists ? { id: folderDoc.id, ...folderDoc.data() } : null,
  })
}
