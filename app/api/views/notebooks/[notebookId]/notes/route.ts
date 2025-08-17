import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ notebookId: string }> }
) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notebookId } = await params
    const searchParams = request.nextUrl.searchParams
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'recent' // recent | alphabetical | created

    console.log('[API] Loading notes for notebook:', {
      notebookId,
      userId,
      offset,
      limit,
      search,
      sort,
    })

    // Get notebook and folder info
    const { data: notebook, error: notebookError } = await supabase
      .from('notebooks')
      .select(
        `
        id,
        name,
        color,
        folder_id,
        owner_id,
        created_by
      `
      )
      .eq('id', notebookId)
      .single()

    if (notebookError || !notebook) {
      console.error('Notebook not found:', {
        notebookId,
        userId,
        error: notebookError,
        notebookData: notebook,
      })
      return NextResponse.json({ error: 'Notebook not found', notebookId }, { status: 404 })
    }

    // Check permissions
    // First check if user is the owner (simple check via owner_id field)
    const isOwner = notebook.owner_id === userId

    // Variables to hold permissions
    let permission = null
    let folderPerm = null

    if (!isOwner) {
      // Not owner, check if user has explicit permission
      const { data: notebookPerm } = await supabase
        .from('permissions')
        .select('permission_level')
        .eq('user_id', userId)
        .eq('resource_id', notebookId)
        .eq('resource_type', 'notebook')
        .neq('permission_level', 'none')
        .single()

      permission = notebookPerm

      if (!permission) {
        // Check for folder-level permission (inherited)
        if (notebook.folder_id) {
          const { data: folderPermData } = await supabase
            .from('permissions')
            .select('permission_level')
            .eq('user_id', userId)
            .eq('resource_id', notebook.folder_id)
            .eq('resource_type', 'folder')
            .neq('permission_level', 'none')
            .single()

          folderPerm = folderPermData

          if (!folderPerm) {
            console.error('Access denied - no permission:', {
              notebookId,
              userId,
              notebookOwnerId: notebook.owner_id,
            })
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
          }
        } else {
          console.error('Access denied - no permission and no folder:', {
            notebookId,
            userId,
            notebookOwnerId: notebook.owner_id,
          })
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }
    }

    // Get folder info and sibling notebooks if notebook has a folder
    let folderInfo = null
    let siblingNotebooks: Array<{ id: string; name: string; color: string }> = []

    if (notebook.folder_id) {
      // Get folder details
      const { data: folder } = await supabase
        .from('folders')
        .select('id, name, color')
        .eq('id', notebook.folder_id)
        .single()

      if (folder) {
        folderInfo = folder

        // Get all notebooks in the same folder
        const { data: siblings } = await supabase
          .from('notebooks')
          .select('id, name, color')
          .eq('folder_id', notebook.folder_id)
          .eq('archived', false)
          .order('name')

        siblingNotebooks = siblings || []
      }
    }

    // Build base query for counting
    let countQuery = supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('notebook_id', notebookId)

    // Add search filter to count query
    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) throw countError

    // Build query for fetching notes
    let notesQuery = supabase
      .from('notes')
      .select(
        `
        id,
        title,
        created_at,
        updated_at,
        content
      `
      )
      .eq('notebook_id', notebookId)

    // Add search filter
    if (search) {
      notesQuery = notesQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    // Add sorting
    switch (sort) {
      case 'alphabetical':
        notesQuery = notesQuery.order('title', { ascending: true })
        break
      case 'created':
        notesQuery = notesQuery.order('created_at', { ascending: false })
        break
      case 'recent':
      default:
        notesQuery = notesQuery.order('updated_at', { ascending: false })
        break
    }

    // Apply pagination
    notesQuery = notesQuery.range(offset, offset + limit - 1)

    const { data: notes, error: notesError } = await notesQuery

    if (notesError) throw notesError

    // Generate previews from actual content (first 150 chars)
    const notesWithPreviews =
      notes?.map(
        (note: {
          id: string
          title: string
          content: string
          created_at: string
          updated_at: string
        }) => {
          // Strip HTML tags and get first 150 characters for preview
          const plainText = note.content
            ? note.content.replace(/<[^>]*>/g, '').substring(0, 150)
            : ''
          return {
            id: note.id,
            title: note.title,
            preview: plainText || 'Empty note',
            created_at: note.created_at,
            updated_at: note.updated_at,
          }
        }
      ) || []

    // Determine permission level for response
    let userPermission: 'owner' | 'read' | 'write' = 'owner'
    if (!isOwner) {
      userPermission = (permission?.permission_level || folderPerm?.permission_level || 'read') as
        | 'read'
        | 'write'
    }

    return NextResponse.json({
      notebook: {
        id: notebook.id,
        name: notebook.name,
        color: notebook.color,
        folder_id: notebook.folder_id,
        folder_name: folderInfo?.name || '',
        shared: !isOwner,
        permission: userPermission,
      },
      folder: folderInfo,
      siblingNotebooks,
      notes: notesWithPreviews,
      currentNote: null, // Load separately when selected
      pagination: {
        total: totalCount || 0,
        offset,
        limit,
        hasMore: offset + limit < (totalCount || 0),
      },
    })
  } catch (error) {
    console.error('Error fetching notes view:', error)
    return NextResponse.json({ error: 'Failed to fetch notes view' }, { status: 500 })
  }
}
