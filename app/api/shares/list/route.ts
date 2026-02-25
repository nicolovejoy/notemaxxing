import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'
import { getAdminAuth } from '@/lib/firebase/admin'

export async function GET(request: Request) {
  const { uid, email: callerEmail, error } = await getAuthenticatedUser(request)
  if (error) return error

  const db = getAdminDb()
  const now = new Date().toISOString()

  const [sharedBySnap, sharedWithSnap] = await Promise.all([
    db.collection('permissions').where('granted_by', '==', uid).get(),
    db.collection('permissions').where('user_id', '==', uid).get(),
  ])

  const sharedByUser: Array<Record<string, unknown>> = sharedBySnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const sharedWithUser: Array<Record<string, unknown>> = sharedWithSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Pending invitations for this user's email
  let pendingInvitations: Array<Record<string, unknown>> = []
  if (callerEmail) {
    const pendingSnap = await db
      .collection('invitations')
      .where('invitee_email', '==', callerEmail.toLowerCase())
      .where('accepted_at', '==', null)
      .where('expires_at', '>', now)
      .get()
    pendingInvitations = pendingSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  // Collect user IDs to resolve emails
  const userIds = new Set<string>()
  sharedByUser.forEach(p => { if (p.user_id) userIds.add(p.user_id as string) })
  sharedWithUser.forEach(p => { if (p.granted_by) userIds.add(p.granted_by as string) })
  pendingInvitations.forEach(i => { if (i.invited_by) userIds.add(i.invited_by as string) })

  const userEmails: Record<string, string> = {}
  await Promise.all(
    Array.from(userIds).map(async (userId) => {
      try {
        const record = await getAdminAuth().getUser(userId)
        userEmails[userId] = record.email || userId
      } catch {
        userEmails[userId] = `User ...${userId.slice(-8)}`
      }
    })
  )

  // Collect resource IDs
  const folderIds = new Set<string>()
  const notebookIds = new Set<string>()
  ;[...sharedByUser, ...sharedWithUser, ...pendingInvitations].forEach(item => {
    if (item.resource_type === 'folder') folderIds.add(item.resource_id as string)
    else if (item.resource_type === 'notebook') notebookIds.add(item.resource_id as string)
  })

  const folderDetails: Record<string, { name: string; color: string }> = {}
  for (const fid of folderIds) {
    const doc = await db.collection('folders').doc(fid).get()
    if (doc.exists) folderDetails[fid] = { name: doc.data()!.name as string, color: doc.data()!.color as string }
  }

  const notebookDetails: Record<string, { name: string; color: string }> = {}
  for (const nbId of notebookIds) {
    const doc = await db.collection('notebooks').doc(nbId).get()
    if (doc.exists) notebookDetails[nbId] = { name: doc.data()!.name as string, color: doc.data()!.color as string }
  }

  const getResource = (type: string, id: string) =>
    type === 'folder' ? folderDetails[id] : notebookDetails[id]

  const formatSharedItem = (item: Record<string, unknown>, type: 'shared_by' | 'shared_with') => {
    const resource = getResource(item.resource_type as string, item.resource_id as string)
    return {
      id: item.id,
      type,
      resourceType: item.resource_type,
      resourceId: item.resource_id,
      resourceName: resource?.name || 'Unknown',
      resourceColor: resource?.color || '',
      permission_level: item.permission_level,
      user: type === 'shared_by'
        ? { id: item.user_id, email: userEmails[item.user_id as string] || '', name: '' }
        : { id: item.granted_by, email: userEmails[item.granted_by as string] || '', name: '' },
      createdAt: item.granted_at || item.created_at,
    }
  }

  const formatInvitation = (inv: Record<string, unknown>) => {
    const resource = getResource(inv.resource_type as string, inv.resource_id as string)
    return {
      id: inv.id,
      type: 'pending_invitation',
      resourceType: inv.resource_type,
      resourceId: inv.resource_id,
      resourceName: resource?.name || 'Unknown',
      resourceColor: resource?.color || '',
      permission_level: inv.permission_level,
      invitedBy: { email: userEmails[inv.invited_by as string] || '', name: '' },
      createdAt: inv.created_at,
      expiresAt: inv.expires_at,
    }
  }

  return NextResponse.json({
    sharedByMe: sharedByUser.map(item => formatSharedItem(item, 'shared_by')),
    sharedWithMe: sharedWithUser.map(item => formatSharedItem(item, 'shared_with')),
    pendingInvitations: pendingInvitations.map(formatInvitation),
  })
}
