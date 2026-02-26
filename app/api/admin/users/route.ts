import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthenticatedUser,
  getAdminDb,
  requireAdmin,
  isAdminEmail,
} from '@/lib/api/firebase-server-helpers'
import { getAdminAuth } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  const { email, error } = await getAuthenticatedUser(request)
  if (error) return error

  const adminError = requireAdmin(email)
  if (adminError) return adminError

  const db = getAdminDb()

  // Fetch users and all content in parallel
  const [listUsersResult, foldersSnap, notebooksSnap, notesSnap, permissionsSnap] =
    await Promise.all([
      getAdminAuth().listUsers(),
      db.collection('folders').select('owner_id').get(),
      db.collection('notebooks').select('owner_id').get(),
      db.collection('notes').select('owner_id').get(),
      db.collection('permissions').select('user_id', 'granted_by').get(),
    ])

  // Build count maps by uid
  const folderCounts = new Map<string, number>()
  const notebookCounts = new Map<string, number>()
  const noteCounts = new Map<string, number>()
  const permGrantedCounts = new Map<string, number>()
  const permReceivedCounts = new Map<string, number>()

  foldersSnap.docs.forEach((d) => {
    const uid = d.data().owner_id as string
    folderCounts.set(uid, (folderCounts.get(uid) || 0) + 1)
  })
  notebooksSnap.docs.forEach((d) => {
    const uid = d.data().owner_id as string
    notebookCounts.set(uid, (notebookCounts.get(uid) || 0) + 1)
  })
  notesSnap.docs.forEach((d) => {
    const uid = d.data().owner_id as string
    noteCounts.set(uid, (noteCounts.get(uid) || 0) + 1)
  })
  permissionsSnap.docs.forEach((d) => {
    const data = d.data()
    const uid = data.user_id as string
    const grantedBy = data.granted_by as string
    permReceivedCounts.set(uid, (permReceivedCounts.get(uid) || 0) + 1)
    permGrantedCounts.set(grantedBy, (permGrantedCounts.get(grantedBy) || 0) + 1)
  })

  const usersWithStats = listUsersResult.users.map((u) => ({
    id: u.uid,
    email: u.email || 'No email',
    created_at: u.metadata.creationTime,
    last_sign_in_at: u.metadata.lastSignInTime,
    is_admin: u.email ? isAdminEmail(u.email) : false,
    stats: {
      folders: folderCounts.get(u.uid) || 0,
      notebooks: notebookCounts.get(u.uid) || 0,
      notes: noteCounts.get(u.uid) || 0,
      permissions_granted: permGrantedCounts.get(u.uid) || 0,
      permissions_received: permReceivedCounts.get(u.uid) || 0,
    },
  }))

  usersWithStats.sort(
    (a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
  )

  return NextResponse.json({ users: usersWithStats, total: usersWithStats.length })
}
