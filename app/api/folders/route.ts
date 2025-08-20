import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, color } = body

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('folders')
      .insert({
        name,
        color,
        owner_id: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating folder:', error)
      return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in folder creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, color } = body

    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    // Check if user owns the folder
    const { data: folder, error: fetchError } = await supabase
      .from('folders')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (fetchError || !folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    if (folder.owner_id !== userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Update the folder
    const updateData: Record<string, string> = {}
    if (name !== undefined) updateData.name = name
    if (color !== undefined) updateData.color = color

    const { data, error } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating folder:', error)
      return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in folder update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
