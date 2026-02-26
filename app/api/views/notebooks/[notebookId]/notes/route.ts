import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getAdminDb } from '@/lib/api/firebase-server-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  const { uid, error } = await getAuthenticatedUser(request)
  if (error) return error

  const { notebookId } = await params
  const searchParams = request.nextUrl.searchParams
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''
  const sortParam = searchParams.get('sort')
  const sortDirParam = searchParams.get('sortDir') as 'asc' | 'desc' | null

  const db = getAdminDb()

  // Get notebook and check access
  const notebookDoc = await db.collection('notebooks').doc(notebookId).get()
  if (!notebookDoc.exists) {
    return NextResponse.json({ error: 'Notebook not found', notebookId }, { status: 404 })
  }

  const notebook = notebookDoc.data()!
  const sort = sortParam || (notebook.sort_order as string) || 'recent'
  const isOwner = notebook.owner_id === uid
  let folderPermLevel: string | null = null

  if (!isOwner) {
    if (!notebook.folder_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const permSnap = await db
      .collection('permissions')
      .where('user_id', '==', uid)
      .where('resource_id', '==', notebook.folder_id)
      .where('resource_type', '==', 'folder')
      .get()

    if (permSnap.empty) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    folderPermLevel = permSnap.docs[0].data().permission_level as string
  }

  // Get folder and sibling notebooks
  let folderInfo: { id: string; name: string; color: string } | null = null
  let siblingNotebooks: Array<{ id: string; name: string; color: string }> = []

  if (notebook.folder_id) {
    const folderDoc = await db
      .collection('folders')
      .doc(notebook.folder_id as string)
      .get()
    if (folderDoc.exists) {
      const f = folderDoc.data()!
      folderInfo = { id: folderDoc.id, name: f.name as string, color: f.color as string }

      const siblingsSnap = await db
        .collection('notebooks')
        .where('folder_id', '==', notebook.folder_id)
        .where('archived', '==', false)
        .orderBy('name')
        .get()
      siblingNotebooks = siblingsSnap.docs.map((doc) => {
        const d = doc.data()
        return { id: doc.id, name: d.name as string, color: d.color as string }
      })
    }
  }

  // Fetch all notes for the notebook (sorting in Firestore, search in memory)
  let notesSnap
  if (sort === 'manual') {
    // Check if any notes need position backfill by querying without orderBy
    // (Firestore orderBy excludes docs where the field doesn't exist)
    const allNotesSnap = await db.collection('notes').where('notebook_id', '==', notebookId).get()

    const needsBackfill = allNotesSnap.docs.some((doc) => {
      const pos = doc.data().position
      return pos === undefined || pos === null
    })

    if (needsBackfill && allNotesSnap.docs.length > 0) {
      // Sort by updated_at desc for consistent backfill ordering
      const sorted = allNotesSnap.docs.sort((a, b) => {
        const aTime = (b.data().updated_at as string) || ''
        const bTime = (a.data().updated_at as string) || ''
        return aTime.localeCompare(bTime)
      })

      const batch = db.batch()
      sorted.forEach((doc, index) => {
        batch.update(doc.ref, { position: (index + 1) * 1000 })
      })
      await batch.commit()
    }

    notesSnap = await db
      .collection('notes')
      .where('notebook_id', '==', notebookId)
      .orderBy('position', 'asc')
      .get()
  } else {
    let orderField = 'updated_at'
    if (sort === 'created') orderField = 'created_at'
    else if (sort === 'alphabetical') orderField = 'title'

    // Always query with indexed direction, reverse in memory if needed
    const defaultDir = sort === 'alphabetical' ? 'asc' : 'desc'

    notesSnap = await db
      .collection('notes')
      .where('notebook_id', '==', notebookId)
      .orderBy(orderField, defaultDir)
      .get()
  }

  let notes: Array<Record<string, unknown>> = notesSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  // Reverse if non-default direction requested (avoids needing extra composite indexes)
  if (sort !== 'manual' && sortDirParam) {
    const defaultDir = sort === 'alphabetical' ? 'asc' : 'desc'
    if (sortDirParam !== defaultDir) {
      notes.reverse()
    }
  }

  // In-memory search filter
  if (search) {
    const lower = search.toLowerCase()
    notes = notes.filter((n) => {
      const title = ((n.title as string) || '').toLowerCase()
      const content = ((n.content as string) || '').toLowerCase()
      return title.includes(lower) || content.includes(lower)
    })
  }

  const totalCount = notes.length
  const paginated = notes.slice(offset, offset + limit)

  const notesWithPreviews = paginated.map((note) => {
    const plainText = ((note.content as string) || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150)
    return {
      id: note.id,
      title: note.title,
      preview: plainText || 'Empty note',
      created_at: note.created_at,
      updated_at: note.updated_at,
      position: note.position as number | undefined,
    }
  })

  const userPermission: 'owner' | 'read' | 'write' = isOwner
    ? 'owner'
    : (folderPermLevel as 'read' | 'write') || 'read'

  return NextResponse.json({
    notebook: {
      id: notebookDoc.id,
      name: notebook.name,
      color: notebook.color,
      folder_id: notebook.folder_id,
      folder_name: folderInfo?.name || '',
      owner_id: notebook.owner_id,
      sort_order: notebook.sort_order || 'recent',
      shared: !isOwner,
      permission: userPermission,
    },
    folder: folderInfo,
    siblingNotebooks,
    notes: notesWithPreviews,
    currentNote: null,
    pagination: {
      total: totalCount,
      offset,
      limit,
      hasMore: offset + limit < totalCount,
    },
  })
}
