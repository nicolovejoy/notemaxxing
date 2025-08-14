import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ notebookId: string; noteId: string }> }
) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notebookId, noteId } = await params

    // Get notebook and folder info
    const { data: notebook, error: notebookError } = await supabase
      .from('notebooks')
      .select(
        `
        id,
        name,
        color,
        folder_id,
        folders!inner(id, name, user_id)
      `
      )
      .eq('id', notebookId)
      .eq('folders.user_id', userId)
      .single()

    if (notebookError || !notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Get the specific note with full content
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('notebook_id', notebookId)
      .single()

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Get list of other notes in notebook (for navigation)
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select(
        `
        id,
        title,
        created_at,
        updated_at
      `
      )
      .eq('notebook_id', notebookId)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (notesError) throw notesError

    const notesWithPreviews =
      notes?.map((n: { id: string; title: string; created_at: string; updated_at: string }) => ({
        ...n,
        preview: n.id === noteId ? note.content.substring(0, 150) : 'Note preview...',
      })) || []

    return NextResponse.json({
      notebook: {
        id: notebook.id,
        name: notebook.name,
        color: notebook.color,
        folder_id: notebook.folder_id,
        folder_name: notebook.folders?.name || '',
      },
      notes: notesWithPreviews,
      currentNote: {
        id: note.id,
        title: note.title,
        content: note.content,
        created_at: note.created_at,
        updated_at: note.updated_at,
      },
      pagination: {
        total: notes?.length || 0,
        offset: 0,
        limit: 20,
        hasMore: false, // TODO: Implement proper pagination
      },
    })
  } catch (error) {
    console.error('Error fetching note view:', error)
    return NextResponse.json({ error: 'Failed to fetch note view' }, { status: 500 })
  }
}
