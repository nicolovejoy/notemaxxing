import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

// GET /api/notebooks - Get all notebooks for a user
export async function GET() {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('notebooks_with_stats')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching notebooks:', error)
    return NextResponse.json({ error: 'Failed to fetch notebooks' }, { status: 500 })
  }
}

// POST /api/notebooks - Create a new notebook
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, color, folder_id } = body

    if (!name || !color || !folder_id) {
      return NextResponse.json(
        { error: 'Name, color, and folder_id are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('notebooks')
      .insert({
        name,
        color,
        folder_id,
        // owner_id and created_by are set automatically by database trigger
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating notebook:', error)
    return NextResponse.json({ error: 'Failed to create notebook' }, { status: 500 })
  }
}

// PATCH /api/notebooks - Update a notebook
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Notebook ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notebooks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating notebook:', error)
    return NextResponse.json({ error: 'Failed to update notebook' }, { status: 500 })
  }
}

// DELETE /api/notebooks - Delete a notebook
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Notebook ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('notebooks').delete().eq('id', id).eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notebook:', error)
    return NextResponse.json({ error: 'Failed to delete notebook' }, { status: 500 })
  }
}
