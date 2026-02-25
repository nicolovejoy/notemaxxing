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

  const snap = await db
    .collection('notebooks')
    .where('folder_id', '==', folderId)
    .where('owner_id', '==', uid)
    .where('archived', '==', false)
    .orderBy('updated_at', 'desc')
    .limit(1)
    .get()

  if (snap.empty) {
    return NextResponse.json({ notebook: null })
  }

  const doc = snap.docs[0]
  return NextResponse.json({ notebook: { id: doc.id, ...doc.data() } })
}
