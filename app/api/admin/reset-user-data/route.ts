import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

const ADMIN_EMAILS = ['nicholas.lovejoy@gmail.com', 'mlovejoy@scu.edu']
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password'

async function deleteCollection(
  db: FirebaseFirestore.Firestore,
  collection: string,
  field: string,
  value: string
) {
  const snap = await db.collection(collection).where(field, '==', value).get()
  const batch = db.batch()
  snap.docs.forEach((doc) => batch.delete(doc.ref))
  if (!snap.empty) await batch.commit()
  return snap.size
}

export async function POST(request: NextRequest) {
  const { email, error } = await getAuthenticatedUser(request)
  if (error) return error

  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { targetUserId, adminPassword } = body

  if (!targetUserId) {
    return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })
  }

  if (adminPassword !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 })
  }

  console.log(`Admin action: ${email} resetting data for user ${targetUserId}`)

  const db = getAdminDb()

  // Count before
  const [foldersSnap, notebooksSnap, notesSnap] = await Promise.all([
    db.collection('folders').where('owner_id', '==', targetUserId).get(),
    db.collection('notebooks').where('owner_id', '==', targetUserId).get(),
    db.collection('notes').where('owner_id', '==', targetUserId).get(),
  ])

  const beforeCounts = {
    folders: foldersSnap.size,
    notebooks: notebooksSnap.size,
    notes: notesSnap.size,
  }

  // Delete in dependency order
  await deleteCollection(db, 'notes', 'owner_id', targetUserId)
  await deleteCollection(db, 'notebooks', 'owner_id', targetUserId)
  await deleteCollection(db, 'folders', 'owner_id', targetUserId)
  await deleteCollection(db, 'permissions', 'user_id', targetUserId)
  await deleteCollection(db, 'permissions', 'granted_by', targetUserId)
  await deleteCollection(db, 'invitations', 'invited_by', targetUserId)

  console.log(
    `Admin action completed: deleted ${JSON.stringify(beforeCounts)} for user ${targetUserId}`
  )

  return NextResponse.json({
    success: true,
    deleted: beforeCounts,
    remaining: { folders: 0, notebooks: 0, notes: 0 },
    targetUserId,
  })
}
