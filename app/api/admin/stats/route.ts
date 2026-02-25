import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'
import { getAdminAuth } from '@/lib/firebase/admin'

const ADMIN_EMAILS = ['nicholas.lovejoy@gmail.com', 'mlovejoy@scu.edu']

export async function GET(request: NextRequest) {
  const { email, error } = await getAuthenticatedUser(request)
  if (error) return error

  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getAdminDb()

  const [foldersSnap, notebooksSnap, notesSnap, permissionsSnap, invitationsSnap, listUsersResult] =
    await Promise.all([
      db.collection('folders').get(),
      db.collection('notebooks').get(),
      db.collection('notes').get(),
      db.collection('permissions').get(),
      db.collection('invitations').where('accepted_at', '==', null).get(),
      getAdminAuth().listUsers(),
    ])

  const users = listUsersResult.users
  const totalUsers = users.length

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const activeUsers = users.filter(
    (u) => u.metadata.lastSignInTime && new Date(u.metadata.lastSignInTime) > thirtyDaysAgo
  ).length
  const newUsers = users.filter((u) => new Date(u.metadata.creationTime!) > sevenDaysAgo).length

  const userMap = new Map<string, string>()
  users.forEach((u) => userMap.set(u.uid, u.email || 'Unknown'))

  // Top sharers
  const sharerCounts = new Map<string, number>()
  permissionsSnap.docs.forEach((doc) => {
    const grantedBy = doc.data().granted_by as string
    sharerCounts.set(grantedBy, (sharerCounts.get(grantedBy) || 0) + 1)
  })
  const topSharers = Array.from(sharerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([uid, count]) => ({ email: userMap.get(uid) || uid, count }))

  // Top creators (by folder count as proxy)
  const creatorCounts = new Map<string, number>()
  ;[...foldersSnap.docs, ...notebooksSnap.docs, ...notesSnap.docs].forEach((doc) => {
    const owner = doc.data().owner_id as string
    creatorCounts.set(owner, (creatorCounts.get(owner) || 0) + 1)
  })
  const topCreators = Array.from(creatorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([uid, count]) => ({ email: userMap.get(uid) || uid, count }))

  const totalFolders = foldersSnap.size
  const totalNotebooks = notebooksSnap.size
  const totalNotes = notesSnap.size

  return NextResponse.json({
    overview: {
      total_users: totalUsers,
      active_users_30d: activeUsers,
      new_users_7d: newUsers,
      total_folders: totalFolders,
      total_notebooks: totalNotebooks,
      total_notes: totalNotes,
      total_permissions: permissionsSnap.size,
      pending_invitations: invitationsSnap.size,
    },
    top_sharers: topSharers,
    top_creators: topCreators,
    averages: {
      folders_per_user: totalUsers > 0 ? (totalFolders / totalUsers).toFixed(1) : '0',
      notebooks_per_user: totalUsers > 0 ? (totalNotebooks / totalUsers).toFixed(1) : '0',
      notes_per_user: totalUsers > 0 ? (totalNotes / totalUsers).toFixed(1) : '0',
    },
  })
}
