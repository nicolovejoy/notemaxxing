import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, notebook_id } = body

    if (!notebook_id) {
      return NextResponse.json({ error: 'Notebook ID is required' }, { status: 400 })
    }

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebook_id)
      .eq('user_id', userId)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        title: title || 'Untitled Note',
        content: content || '',
        notebook_id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}

// PATCH /api/notes - Update a note
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, content } = body

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    // Verify note ownership through notebook
    const { data: note } = await supabase
      .from('notes')
      .select('notebooks!inner(user_id)')
      .eq('id', id)
      .eq('notebooks.user_id', userId)
      .single()

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('notes')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

// DELETE /api/notes - Delete a note
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
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    // Verify note ownership through notebook
    const { data: note } = await supabase
      .from('notes')
      .select('notebooks!inner(user_id)')
      .eq('id', id)
      .eq('notebooks.user_id', userId)
      .single()

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const { error } = await supabase.from('notes').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
