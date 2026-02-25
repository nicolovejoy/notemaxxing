import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function GET(request: Request) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const db = getAdminDb()

  // Owned folders
  const ownedSnap = await db.collection('folders').where('owner_id', '==', uid).get()
  const ownedFolders = ownedSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const ownedFolderIds = new Set(ownedFolders.map((f) => f.id))

  // Folder-level permissions shared with this user
  const sharedPermsSnap = await db
    .collection('permissions')
    .where('user_id', '==', uid)
    .where('resource_type', '==', 'folder')
    .get()

  const sharedPerms = sharedPermsSnap.docs.map((doc) => doc.data())
  const permissionMap: Record<string, string> = {}
  sharedPerms.forEach((p) => {
    permissionMap[p.resource_id as string] = p.permission_level as string
  })

  // Fetch shared folder docs
  const sharedFolderIds = sharedPerms
    .map((p) => p.resource_id as string)
    .filter((id) => !ownedFolderIds.has(id))

  const sharedFolders: Array<Record<string, unknown>> = []
  for (const fid of sharedFolderIds) {
    const doc = await db.collection('folders').doc(fid).get()
    if (doc.exists) sharedFolders.push({ id: doc.id, ...doc.data() })
  }

  // Which owned folders are shared by this user with others
  const sharedByMeSnap = await db
    .collection('permissions')
    .where('resource_type', '==', 'folder')
    .where('granted_by', '==', uid)
    .get()
  const sharedByMeIds = new Set(
    sharedByMeSnap.docs
      .map((doc) => doc.data().resource_id as string)
      .filter((id) => ownedFolderIds.has(id))
  )

  // Build combined folder list
  const allFolders: Array<Record<string, unknown>> = ([] as Array<Record<string, unknown>>)
    .concat(
      ownedFolders.map((f) => ({
        ...f,
        sharedByMe: sharedByMeIds.has(f.id),
        sharedWithMe: false,
        permission: 'owner',
      })),
      sharedFolders.map((f) => ({
        ...f,
        sharedByMe: false,
        sharedWithMe: true,
        permission: permissionMap[f.id as string] || 'read',
      }))
    )
    .sort((a, b) => (a.name as string).localeCompare(b.name as string))

  const allFolderIds = allFolders.map((f) => f.id as string)

  // Get all non-archived notebooks for accessible folders
  let allNotebooks: Array<Record<string, unknown>> = []
  if (allFolderIds.length > 0) {
    const notebooksSnap = await db
      .collection('notebooks')
      .where('folder_id', 'in', allFolderIds)
      .where('archived', '==', false)
      .orderBy('name')
      .get()
    allNotebooks = notebooksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }

  // Get archived notebooks for archived_count per folder
  const archivedCountMap: Record<string, number> = {}
  if (allFolderIds.length > 0) {
    const archivedSnap = await db
      .collection('notebooks')
      .where('folder_id', 'in', allFolderIds)
      .where('archived', '==', true)
      .get()
    archivedSnap.docs.forEach((doc) => {
      const fid = doc.data().folder_id as string
      archivedCountMap[fid] = (archivedCountMap[fid] || 0) + 1
    })
  }

  // Most recent notebook per folder (by updated_at)
  const mostRecentByFolder: Record<string, string> = {}
  allNotebooks.forEach((nb) => {
    const fid = nb.folder_id as string
    if (!mostRecentByFolder[fid]) {
      mostRecentByFolder[fid] = nb.id as string
    } else {
      const currentBest = allNotebooks.find((n) => n.id === mostRecentByFolder[fid])
      if (
        currentBest &&
        new Date(nb.updated_at as string) > new Date(currentBest.updated_at as string)
      ) {
        mostRecentByFolder[fid] = nb.id as string
      }
    }
  })

  // Note counts per notebook
  const notebookIds = allNotebooks.map((n) => n.id as string)
  const noteCountMap: Record<string, number> = {}
  if (notebookIds.length > 0) {
    const notesSnap = await db.collection('notes').where('notebook_id', 'in', notebookIds).get()
    notesSnap.docs.forEach((doc) => {
      const nbId = doc.data().notebook_id as string
      noteCountMap[nbId] = (noteCountMap[nbId] || 0) + 1
    })
  }

  // Group notebooks by folder with note counts
  const notebooksByFolder: Record<
    string,
    Array<{ id: string; name: string; color: string; note_count: number }>
  > = {}
  allNotebooks.forEach((nb) => {
    const fid = nb.folder_id as string
    if (!notebooksByFolder[fid]) notebooksByFolder[fid] = []
    notebooksByFolder[fid].push({
      id: nb.id as string,
      name: nb.name as string,
      color: nb.color as string,
      note_count: noteCountMap[nb.id as string] || 0,
    })
  })

  // Compose folder responses
  const foldersWithNotebooks = allFolders.map((folder) => ({
    ...folder,
    notebook_count: (notebooksByFolder[folder.id as string] || []).length,
    note_count: (notebooksByFolder[folder.id as string] || []).reduce(
      (s, n) => s + n.note_count,
      0
    ),
    archived_count: archivedCountMap[folder.id as string] || 0,
    notebooks: notebooksByFolder[folder.id as string] || [],
    most_recent_notebook_id: mostRecentByFolder[folder.id as string] || null,
  }))

  // Orphaned notebooks: shared at notebook level, but folder not in our list
  const accessibleFolderIds = new Set(allFolderIds)
  const nbPermsSnap = await db
    .collection('permissions')
    .where('user_id', '==', uid)
    .where('resource_type', '==', 'notebook')
    .get()

  const orphanedNotebooks: Array<Record<string, unknown>> = []
  for (const permDoc of nbPermsSnap.docs) {
    const perm = permDoc.data()
    const nbDoc = await db
      .collection('notebooks')
      .doc(perm.resource_id as string)
      .get()
    if (!nbDoc.exists) continue
    const nb = nbDoc.data()!
    if (!accessibleFolderIds.has(nb.folder_id as string)) {
      orphanedNotebooks.push({
        id: nbDoc.id,
        name: nb.name,
        color: nb.color,
        note_count: 0,
        shared_by: 'Shared',
        permission: perm.permission_level,
        is_owner: false,
      })
    }
  }

  // Stats
  const totalNotes = Object.values(noteCountMap).reduce((a, b) => a + b, 0)
  const totalArchived = Object.values(archivedCountMap).reduce((a, b) => a + b, 0)

  return NextResponse.json({
    folders: foldersWithNotebooks,
    orphanedNotebooks,
    stats: {
      total_folders: allFolders.length,
      total_notebooks: allNotebooks.length,
      total_notes: totalNotes,
      total_archived: totalArchived,
    },
  })
}
