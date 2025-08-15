import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()
    const { id } = await params

    // Check if it's a notebook
    const { data: notebook, error: notebookError } = await supabase
      .from('notebooks')
      .select('id, name, folder_id, user_id, archived')
      .eq('id', id)
      .single()

    // Check if it's a folder
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, user_id')
      .eq('id', id)
      .single()

    return NextResponse.json({
      queryId: id,
      currentUserId: userId,
      isNotebook: !notebookError && notebook !== null,
      isFolder: !folderError && folder !== null,
      notebook: notebook || null,
      folder: folder || null,
      notebookError: notebookError?.message || null,
      folderError: folderError?.message || null,
    })
  } catch {
    return NextResponse.json({ error: 'Debug check failed' }, { status: 500 })
  }
}
