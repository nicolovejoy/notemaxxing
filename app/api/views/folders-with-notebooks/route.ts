import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

interface Notebook {
  id: string
  name: string
  color: string
  folder_id: string
  archived: boolean
  created_at: string
  updated_at: string
}

interface Folder {
  id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export async function GET() {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get folders with stats
    const { data: folders, error: foldersError } = await supabase
      .from('folders_with_stats')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (foldersError) throw foldersError

    // Get all notebooks for these folders
    const folderIds = (folders as Folder[])?.map((f) => f.id) || []

    const { data: notebooks, error: notebooksError } = await supabase
      .from('notebooks')
      .select('id, name, color, folder_id, archived, created_at, updated_at')
      .in('folder_id', folderIds)
      .eq('archived', false)
      .order('name')

    if (notebooksError) throw notebooksError

    // Get note counts for each notebook
    const notebookIds = (notebooks as Notebook[])?.map((n) => n.id) || []

    const { data: noteCounts, error: noteCountError } = await supabase
      .from('notes')
      .select('notebook_id')
      .in('notebook_id', notebookIds)

    if (noteCountError) throw noteCountError

    // Count notes per notebook
    const noteCountMap = noteCounts
      ? (noteCounts as Array<{ notebook_id: string }>).reduce<Record<string, number>>(
          (acc, note) => {
            acc[note.notebook_id] = (acc[note.notebook_id] || 0) + 1
            return acc
          },
          {}
        )
      : {}

    // Add note counts to notebooks
    const notebooksWithCounts =
      (notebooks as Notebook[])?.map((nb) => ({
        ...nb,
        note_count: noteCountMap[nb.id] || 0,
      })) || []

    // Group notebooks by folder
    const notebooksByFolder = notebooksWithCounts.reduce<Record<string, typeof notebooksWithCounts>>(
      (acc, nb) => {
        if (!acc[nb.folder_id]) acc[nb.folder_id] = []
        acc[nb.folder_id].push(nb)
        return acc
      },
      {} as Record<string, typeof notebooksWithCounts>
    )

    // Combine folders with their notebooks
    const foldersWithNotebooks =
      (folders as Folder[])?.map((folder) => ({
        ...folder,
        notebooks: notebooksByFolder[folder.id] || [],
      })) || []

    // Get stats
    const totalFolders = folders?.length || 0
    const totalNotebooks = notebooks?.length || 0
    const totalNotes = noteCounts?.length || 0
    const totalArchived = (folders as Array<Folder & { archived_count?: number }>)?.reduce((sum: number, f) => sum + (f.archived_count || 0), 0) || 0

    return NextResponse.json({
      folders: foldersWithNotebooks,
      orphanedNotebooks: [], // TODO: Add orphaned notebooks if needed
      stats: {
        total_folders: totalFolders,
        total_notebooks: totalNotebooks,
        total_notes: totalNotes,
        total_archived: totalArchived,
      },
    })
  } catch (error) {
    console.error('Error fetching folders with notebooks:', error)
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
  }
}
