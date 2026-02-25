import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function GET(request: Request) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const db = getAdminDb()

  // Get owned folders
  const foldersSnap = await db
    .collection('folders')
    .where('owner_id', '==', uid)
    .orderBy('name')
    .get()
  const folders = foldersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const folderIds = folders.map((f) => f.id)

  // Get all non-archived notebooks for these folders
  let notebooks: Array<Record<string, unknown>> = []
  if (folderIds.length > 0) {
    const notebooksSnap = await db
      .collection('notebooks')
      .where('folder_id', 'in', folderIds)
      .where('archived', '==', false)
      .orderBy('name')
      .get()
    notebooks = notebooksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }

  const notebookIds = notebooks.map((n) => n.id as string)

  // Get note counts
  const noteCountMap: Record<string, number> = {}
  if (notebookIds.length > 0) {
    const notesSnap = await db.collection('notes').where('notebook_id', 'in', notebookIds).get()
    notesSnap.docs.forEach((doc) => {
      const nb_id = doc.data().notebook_id as string
      noteCountMap[nb_id] = (noteCountMap[nb_id] || 0) + 1
    })
  }

  const notebooksWithCounts: Array<Record<string, unknown>> = notebooks.map((nb) => ({
    ...nb,
    note_count: noteCountMap[nb.id as string] || 0,
  }))

  // Group notebooks by folder
  const notebooksByFolder: Record<string, typeof notebooksWithCounts> = {}
  notebooksWithCounts.forEach((nb) => {
    const fid = nb.folder_id as string
    if (!notebooksByFolder[fid]) notebooksByFolder[fid] = []
    notebooksByFolder[fid].push(nb)
  })

  // Get archived count per folder
  const archivedCountMap: Record<string, number> = {}
  if (folderIds.length > 0) {
    const archivedSnap = await db
      .collection('notebooks')
      .where('folder_id', 'in', folderIds)
      .where('archived', '==', true)
      .get()
    archivedSnap.docs.forEach((doc) => {
      const fid = doc.data().folder_id as string
      archivedCountMap[fid] = (archivedCountMap[fid] || 0) + 1
    })
  }

  const foldersWithNotebooks = folders.map((folder) => ({
    ...folder,
    notebook_count: (notebooksByFolder[folder.id] || []).length,
    note_count: (notebooksByFolder[folder.id] || []).reduce(
      (s, nb) => s + (nb.note_count as number),
      0
    ),
    archived_count: archivedCountMap[folder.id] || 0,
    notebooks: notebooksByFolder[folder.id] || [],
  }))

  return NextResponse.json({
    folders: foldersWithNotebooks,
    orphanedNotebooks: [],
    stats: {
      total_folders: folders.length,
      total_notebooks: notebooks.length,
      total_notes: Object.values(noteCountMap).reduce((a, b) => a + b, 0),
      total_archived: Object.values(archivedCountMap).reduce((a, b) => a + b, 0),
    },
  })
}
