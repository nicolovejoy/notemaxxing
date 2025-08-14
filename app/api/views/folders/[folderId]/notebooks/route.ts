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
    const searchParams = request.nextUrl.searchParams
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get folder info
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, color')
      .eq('id', folderId)
      .eq('user_id', userId)
      .single()

    if (folderError || !folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('notebooks_with_stats')
      .select('*', { count: 'exact', head: true })
      .eq('folder_id', folderId)

    if (countError) throw countError

    // Get paginated notebooks with stats from the view
    const { data: notebooks, error: notebooksError } = await supabase
      .from('notebooks_with_stats')
      .select('*')
      .eq('folder_id', folderId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (notebooksError) throw notebooksError

    return NextResponse.json({
      folder,
      notebooks: notebooks || [],
      pagination: {
        total: totalCount || 0,
        offset,
        limit,
        hasMore: offset + limit < (totalCount || 0),
      },
    })
  } catch (error) {
    console.error('Error fetching notebook view:', error)
    return NextResponse.json({ error: 'Failed to fetch notebook view' }, { status: 500 })
  }
}
