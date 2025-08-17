import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { folderId } = await params

    // Get folder details
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .single()

    if (folderError || !folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Check access and get permission level
    const isOwner = folder.owner_id === userId
    let userPermission: 'owner' | 'read' | 'write' = 'owner'
    let hasAccess = isOwner

    if (!isOwner) {
      // Check if user has permission to this folder
      const { data: permission } = await supabase
        .from('permissions')
        .select('permission_level')
        .eq('resource_id', folderId)
        .eq('resource_type', 'folder')
        .eq('user_id', userId)
        .single()

      if (permission) {
        hasAccess = true
        userPermission = permission.permission_level as 'read' | 'write'
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if folder is shared (for owners)
    let isSharedByOwner = false
    if (isOwner) {
      const { data: shares } = await supabase
        .from('permissions')
        .select('id')
        .eq('resource_id', folderId)
        .eq('resource_type', 'folder')
        .eq('granted_by', userId)
        .limit(1)

      isSharedByOwner = !!shares && shares.length > 0
    }

    // Get notebooks in this folder
    const { data: notebooks, error: notebooksError } = await supabase
      .from('notebooks')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false })
    
    type Notebook = typeof notebooks extends (infer T)[] ? T : never

    if (notebooksError) {
      console.error('Error fetching notebooks:', notebooksError)
      return NextResponse.json({ error: 'Failed to fetch notebooks' }, { status: 500 })
    }

    // Get note counts and check which notebooks are shared
    const notebooksWithDetails = await Promise.all(
      (notebooks || []).map(async (notebook: Notebook) => {
        // Get note count
        const { count } = await supabase
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('notebook_id', notebook.id)

        // Check if notebook is individually shared (for owners)
        let isShared = false
        if (isOwner) {
          const { data: notebookShares } = await supabase
            .from('permissions')
            .select('id')
            .eq('resource_id', notebook.id)
            .eq('resource_type', 'notebook')
            .eq('granted_by', userId)
            .limit(1)

          isShared = !!notebookShares && notebookShares.length > 0
        }

        return {
          ...notebook,
          note_count: count || 0,
          shared_by_owner: isShared,
        }
      })
    )

    return NextResponse.json({
      folder: {
        ...folder,
        shared: !isOwner,
        sharedByOwner: isSharedByOwner,
        permission: userPermission,
      },
      notebooks: notebooksWithDetails,
      userPermission,
    })
  } catch (error) {
    console.error('Error fetching folder view:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
