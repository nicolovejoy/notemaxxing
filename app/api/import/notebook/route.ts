import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/api/firebase-server-helpers'

function authenticateApiKey(request: NextRequest): NextResponse | null {
  const key = process.env.IMPORT_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'Import not configured' }, { status: 503 })
  }

  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token !== key) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

export async function POST(request: NextRequest) {
  const authError = authenticateApiKey(request)
  if (authError) return authError

  const ownerId = process.env.IMPORT_OWNER_ID
  if (!ownerId) {
    return NextResponse.json({ error: 'Import owner not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { folder_id, notebook_name, color, notes } = body

    if (!folder_id || !notebook_name) {
      return NextResponse.json(
        { error: 'folder_id and notebook_name are required' },
        { status: 400 }
      )
    }

    const db = getAdminDb()

    // Verify folder exists and belongs to the configured owner
    const folderDoc = await db.collection('folders').doc(folder_id).get()
    if (!folderDoc.exists) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }
    if (folderDoc.data()!.owner_id !== ownerId) {
      return NextResponse.json({ error: 'Folder owner mismatch' }, { status: 403 })
    }

    const now = new Date().toISOString()

    // Create notebook
    const notebookData = {
      name: notebook_name,
      color: color || 'bg-gray-500',
      folder_id,
      owner_id: ownerId,
      created_by: ownerId,
      archived: false,
      archived_at: null,
      created_at: now,
      updated_at: now,
    }
    const notebookRef = await db.collection('notebooks').add(notebookData)

    // Create notes with gap-based positions
    const noteEntries: Array<{ title: string; content: string }> = Array.isArray(notes) ? notes : []
    const noteIds: string[] = []

    for (let i = 0; i < noteEntries.length; i++) {
      const entry = noteEntries[i]
      const noteData = {
        title: entry.title || 'Untitled Note',
        content: entry.content || '',
        notebook_id: notebookRef.id,
        folder_id,
        owner_id: ownerId,
        created_by: ownerId,
        created_at: now,
        updated_at: now,
        position: (i + 1) * 1000,
      }
      const noteRef = await db.collection('notes').add(noteData)
      noteIds.push(noteRef.id)
    }

    return NextResponse.json({
      notebook_id: notebookRef.id,
      note_ids: noteIds,
      note_count: noteIds.length,
    })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 }
    )
  }
}
