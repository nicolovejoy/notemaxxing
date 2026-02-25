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
  const now = new Date().toISOString()

  const [permissionsSnap, invitationsSnap, listUsersResult] = await Promise.all([
    db.collection('permissions').orderBy('granted_at', 'desc').get(),
    db
      .collection('invitations')
      .where('accepted_at', '==', null)
      .where('expires_at', '>', now)
      .orderBy('expires_at', 'desc')
      .get(),
    getAdminAuth().listUsers(),
  ])

  const userMap = new Map<string, string>()
  listUsersResult.users.forEach((u) => userMap.set(u.uid, u.email || 'Unknown'))

  // Collect resource IDs
  const folderIds = new Set<string>()
  const notebookIds = new Set<string>()

  const permissions = permissionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const invitations = invitationsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  ;[...permissions, ...invitations].forEach((item: Record<string, unknown>) => {
    if (item.resource_type === 'folder') folderIds.add(item.resource_id as string)
    else if (item.resource_type === 'notebook') notebookIds.add(item.resource_id as string)
  })

  // Fetch resource names
  const folderMap = new Map<string, string>()
  for (const fid of folderIds) {
    const doc = await db.collection('folders').doc(fid).get()
    if (doc.exists) folderMap.set(fid, doc.data()!.name as string)
  }

  const notebookMap = new Map<string, string>()
  for (const nbId of notebookIds) {
    const doc = await db.collection('notebooks').doc(nbId).get()
    if (doc.exists) notebookMap.set(nbId, doc.data()!.name as string)
  }

  const getResourceName = (type: string, id: string) =>
    type === 'folder'
      ? folderMap.get(id) || 'Unknown Folder'
      : notebookMap.get(id) || 'Unknown Notebook'

  const enrichedPermissions = permissions.map((perm: Record<string, unknown>) => ({
    ...perm,
    user_email: userMap.get(perm.user_id as string) || perm.user_id,
    granted_by_email: userMap.get(perm.granted_by as string) || perm.granted_by,
    resource_name: getResourceName(perm.resource_type as string, perm.resource_id as string),
  }))

  const enrichedInvitations = invitations.map((inv: Record<string, unknown>) => ({
    ...inv,
    invited_by_email: userMap.get(inv.invited_by as string) || inv.invited_by,
    resource_name: getResourceName(inv.resource_type as string, inv.resource_id as string),
  }))

  return NextResponse.json({
    permissions: enrichedPermissions,
    invitations: enrichedInvitations,
    stats: {
      total_permissions: permissions.length,
      total_folders_shared: folderIds.size,
      total_notebooks_shared: notebookIds.size,
      pending_invitations: invitations.length,
    },
  })
}
