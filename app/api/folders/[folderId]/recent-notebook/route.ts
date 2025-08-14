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

    // Get the most recently updated notebook in this folder
    const { data: notebook, error } = await supabase
      .from('notebooks')
      .select('id, name, updated_at')
      .eq('folder_id', folderId)
      .eq('user_id', userId)
      .eq('archived', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !notebook) {
      // No notebooks in folder, return null
      return NextResponse.json({ notebook: null })
    }

    return NextResponse.json({ notebook })
  } catch (error) {
    console.error('Error fetching recent notebook:', error)
    return NextResponse.json({ error: 'Failed to fetch recent notebook' }, { status: 500 })
  }
}
