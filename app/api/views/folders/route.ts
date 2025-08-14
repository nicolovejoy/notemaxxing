import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

export async function GET() {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get folders with stats from the view - much simpler!
    const { data: folders, error: foldersError } = await supabase
      .from('folders_with_stats')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (foldersError) throw foldersError

    // Get all notebooks for these folders to show in the UI
    const folderIds = folders?.map((f) => f.id) || []

    let notebooksWithCounts: Array<{ id: string; name: string; color: string; folder_id: string; note_count: number }> = []
    let mostRecentNotebookByFolder: Record<string, string> = {}

    if (folderIds.length > 0) {
      // Get notebooks with updated_at for finding most recent
      const { data: notebooks, error: notebooksError } = await supabase
        .from('notebooks')
        .select('id, name, color, folder_id, updated_at')
        .in('folder_id', folderIds)
        .eq('archived', false)
        .order('name')

      if (notebooksError) throw notebooksError

      // Find most recent notebook for each folder
      notebooks?.forEach((nb) => {
        if (!mostRecentNotebookByFolder[nb.folder_id]) {
          mostRecentNotebookByFolder[nb.folder_id] = nb.id
        } else {
          // Compare updated_at to find most recent
          const currentMostRecent = notebooks.find(
            (n) => n.id === mostRecentNotebookByFolder[nb.folder_id]
          )
          if (
            currentMostRecent &&
            new Date(nb.updated_at) > new Date(currentMostRecent.updated_at)
          ) {
            mostRecentNotebookByFolder[nb.folder_id] = nb.id
          }
        }
      })

      // Get note counts for each notebook
      const notebookIds = notebooks?.map((n) => n.id) || []

      if (notebookIds.length > 0) {
        const { data: noteCounts, error: noteCountError } = await supabase
          .from('notes')
          .select('notebook_id')
          .in('notebook_id', notebookIds)

        if (noteCountError) throw noteCountError

        // Count notes per notebook
        const noteCountMap =
          noteCounts?.reduce(
            (acc, note) => {
              acc[note.notebook_id] = (acc[note.notebook_id] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          ) || {}

        // Add note counts to notebooks
        notebooksWithCounts =
          notebooks?.map((nb) => ({
            id: nb.id,
            name: nb.name,
            color: nb.color,
            folder_id: nb.folder_id,
            note_count: noteCountMap[nb.id] || 0,
          })) || []
      }
    }

    // Group notebooks by folder
    const notebooksByFolder = notebooksWithCounts.reduce(
      (acc, nb) => {
        if (!acc[nb.folder_id]) acc[nb.folder_id] = []
        acc[nb.folder_id].push({
          id: nb.id,
          name: nb.name,
          color: nb.color,
          note_count: nb.note_count,
        })
        return acc
      },
      {} as Record<string, Array<{ id: string; name: string; color: string; note_count: number }>>

    )

    // Add notebooks and most recent notebook ID to each folder
    const foldersWithNotebooks =
      folders?.map((folder) => ({
        ...folder,
        notebooks: notebooksByFolder[folder.id] || [],
        most_recent_notebook_id: mostRecentNotebookByFolder[folder.id] || null,
      })) || []

    // Get orphaned shared notebooks
    // First get permissions for notebooks
    const { data: notebookPermissions, error: permError } = await supabase
      .from('permissions')
      .select('resource_id, permission')
      .eq('user_id', userId)
      .eq('resource_type', 'notebook')

    if (permError) throw permError

    let orphanedNotebooks: Array<{ id: string; name: string; color: string; note_count: number; shared_by: string; permission: 'read' | 'write' }> = []

    if (notebookPermissions && notebookPermissions.length > 0) {
      // Get the actual notebook data
      const notebookIds = notebookPermissions.map((p) => p.resource_id)
      const { data: sharedNotebooks, error: nbError } = await supabase
        .from('notebooks')
        .select('id, name, color, folder_id')
        .in('id', notebookIds)

      if (nbError) throw nbError

      // Filter orphaned notebooks (those whose folders we don't have access to)
      const accessibleFolderIds = new Set(folderIds)
      orphanedNotebooks = (sharedNotebooks || [])
        .filter((nb) => !accessibleFolderIds.has(nb.folder_id))
        .map((nb) => {
          const permission = notebookPermissions.find((p) => p.resource_id === nb.id)
          return {
            id: nb.id,
            name: nb.name,
            color: nb.color,
            note_count: 0, // TODO: Add count
            shared_by: 'Someone', // TODO: Get actual sharer
            permission: permission?.permission as 'read' | 'write',
          }
        })
    }

    // Get user stats from the view
    const { data: userStatsData, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (statsError) {
      console.error('Error fetching user stats:', statsError)
    }

    // Format response - folders already have stats from the view!
    const stats = userStatsData || {
      total_folders: folders?.length || 0,
      total_notebooks: 0,
      total_notes: 0,
      total_archived: 0,
    }

    return NextResponse.json({
      folders: foldersWithNotebooks || [],
      orphanedNotebooks,
      stats,
    })
  } catch (error) {
    console.error('Error fetching folders view:', error)
    return NextResponse.json({ error: 'Failed to fetch folders view' }, { status: 500 })
  }
}
