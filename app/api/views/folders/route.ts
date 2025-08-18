import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

export async function GET() {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get folders user has access to (owned or shared)
    // First get all folders the user owns
    const { data: ownedFolders, error: ownedError } = await supabase
      .from('folders_with_stats')
      .select('*')
      .eq('owner_id', userId)

    if (ownedError) throw ownedError

    // Then get folders shared with the user via permissions
    const { data: sharedPerms, error: permError } = await supabase
      .from('permissions')
      .select('resource_id, permission_level')
      .eq('user_id', userId)
      .eq('resource_type', 'folder')
      .neq('permission_level', 'none')

    if (permError) throw permError

    type FolderFromView = {
      id: string
      name: string
      color: string
      notebook_count: number
      note_count: number
      archived_count: number
      created_at: string
      updated_at: string
      owner_id: string
    }

    let sharedFolders: FolderFromView[] = []
    if (sharedPerms && sharedPerms.length > 0) {
      const sharedFolderIds = sharedPerms.map((p: { resource_id: string }) => p.resource_id)
      const { data: sharedFolderData, error: sharedError } = await supabase
        .from('folders_with_stats')
        .select('*')
        .in('id', sharedFolderIds)

      if (sharedError) throw sharedError
      sharedFolders = sharedFolderData || []
    }

    // Get list of folders that the user has shared with others
    let sharedByMeFolderIds: Set<string> = new Set()
    if (ownedFolders && ownedFolders.length > 0) {
      const ownedFolderIds = ownedFolders.map((f: { id: string }) => f.id)
      const { data: sharedByMe } = await supabase
        .from('permissions')
        .select('resource_id')
        .in('resource_id', ownedFolderIds)
        .eq('resource_type', 'folder')
        .eq('granted_by', userId)

      if (sharedByMe) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sharedByMeFolderIds = new Set(sharedByMe.map((p: any) => p.resource_id))
      }
    }

    // Create permission map for shared folders
    const permissionMap: Record<string, string> = {}
    if (sharedPerms) {
      sharedPerms.forEach((p: { resource_id: string; permission_level: string }) => {
        permissionMap[p.resource_id] = p.permission_level
      })
    }

    // Combine owned and shared folders with proper flags
    const folders = [
      ...(ownedFolders || []).map((f: FolderFromView) => ({
        ...f,
        sharedByMe: sharedByMeFolderIds.has(f.id),
        sharedWithMe: false,
        permission: 'owner' as const,
      })),
      ...sharedFolders.map((f: FolderFromView) => ({
        ...f,
        sharedByMe: false,
        sharedWithMe: true,
        permission: permissionMap[f.id] || 'read',
      })),
    ].sort((a, b) => a.name.localeCompare(b.name))

    // Get all notebooks for these folders to show in the UI
    const folderIds = folders?.map((f: { id: string }) => f.id) || []

    let notebooksWithCounts: Array<{
      id: string
      name: string
      color: string
      folder_id: string
      note_count: number
    }> = []
    const mostRecentNotebookByFolder: Record<string, string> = {}

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
      notebooks?.forEach((nb: { id: string; folder_id: string; updated_at: string }) => {
        if (!mostRecentNotebookByFolder[nb.folder_id]) {
          mostRecentNotebookByFolder[nb.folder_id] = nb.id
        } else {
          // Compare updated_at to find most recent
          const currentMostRecent = notebooks.find(
            (n: { id: string; updated_at: string }) =>
              n.id === mostRecentNotebookByFolder[nb.folder_id]
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
      const notebookIds = notebooks?.map((n: { id: string }) => n.id) || []

      if (notebookIds.length > 0) {
        const { data: noteCounts, error: noteCountError } = await supabase
          .from('notes')
          .select('notebook_id')
          .in('notebook_id', notebookIds)

        if (noteCountError) throw noteCountError

        // Count notes per notebook
        const noteCountMap =
          noteCounts?.reduce(
            (acc: Record<string, number>, note: { notebook_id: string }) => {
              acc[note.notebook_id] = (acc[note.notebook_id] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          ) || {}

        // Add note counts to notebooks
        notebooksWithCounts =
          notebooks?.map((nb: { id: string; name: string; color: string; folder_id: string }) => ({
            id: nb.id,
            name: nb.name,
            color: nb.color,
            folder_id: nb.folder_id,
            note_count: noteCountMap[nb.id] || 0,
          })) || []
      }
    }

    // Group notebooks by folder
    type NotebookSummary = { id: string; name: string; color: string; note_count: number }
    const notebooksByFolder = notebooksWithCounts.reduce<Record<string, NotebookSummary[]>>(
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
      {}
    )

    // Add notebooks and most recent notebook ID to each folder (keep all flags)
    const foldersWithNotebooks =
      folders?.map((folder) => ({
        ...folder,
        notebooks: notebooksByFolder[folder.id] || [],
        most_recent_notebook_id: mostRecentNotebookByFolder[folder.id] || null,
      })) || []

    // Get orphaned shared notebooks (shared notebooks whose folders we can't access)
    // Get notebook permissions
    const { data: notebookPerms, error: nbPermError } = await supabase
      .from('permissions')
      .select('resource_id, permission_level')
      .eq('user_id', userId)
      .eq('resource_type', 'notebook')
      .neq('permission_level', 'none')

    if (nbPermError) throw nbPermError

    type OrphanedNotebook = {
      id: string
      name: string
      color: string
      note_count: number
      shared_by: string
      permission: string
      is_owner: boolean
    }

    let orphanedNotebooks: OrphanedNotebook[] = []
    if (notebookPerms && notebookPerms.length > 0) {
      const sharedNotebookIds = notebookPerms.map((p: { resource_id: string }) => p.resource_id)
      const { data: sharedNotebookData, error: sharedNbError } = await supabase
        .from('notebooks')
        .select('id, name, color, folder_id')
        .in('id', sharedNotebookIds)

      if (sharedNbError) throw sharedNbError

      // Filter orphaned notebooks (those whose folders we don't have access to)
      const accessibleFolderIds = new Set(folderIds)
      orphanedNotebooks = (sharedNotebookData || [])
        .filter((nb: { folder_id: string }) => !accessibleFolderIds.has(nb.folder_id))
        .map((nb: { id: string; name: string; color: string }) => {
          const perm = notebookPerms.find((p: { resource_id: string }) => p.resource_id === nb.id)
          return {
            id: nb.id,
            name: nb.name,
            color: nb.color,
            note_count: 0, // TODO: Add count
            shared_by: 'Shared', // TODO: Get actual sharer name
            permission: perm?.permission_level || 'read',
            is_owner: false,
          }
        })
    }

    // Get user stats from the view
    const { data: userStatsData, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle() // Use maybeSingle() since user might have no folders yet

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
