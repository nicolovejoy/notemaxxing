import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { permission_level } = await request.json()

    if (!permission_level || !['read', 'write'].includes(permission_level)) {
      return NextResponse.json(
        { error: 'Invalid permission level. Must be "read" or "write"' },
        { status: 400 }
      )
    }

    // First check if the permission exists
    const { data: permission, error: fetchError } = await supabase
      .from('permissions')
      .select('id, resource_id, resource_type')
      .eq('id', id)
      .single()

    if (fetchError || !permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
    }

    // Now check if user is the owner of the resource
    let isOwner = false
    
    if (permission.resource_type === 'folder') {
      const { data: folder } = await supabase
        .from('folders')
        .select('owner_id')
        .eq('id', permission.resource_id)
        .single()
      
      isOwner = folder?.owner_id === userId
    } else if (permission.resource_type === 'notebook') {
      const { data: notebook } = await supabase
        .from('notebooks')
        .select('owner_id')
        .eq('id', permission.resource_id)
        .single()
      
      isOwner = notebook?.owner_id === userId
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only resource owners can update permissions' },
        { status: 403 }
      )
    }

    // Update the permission
    const { data, error } = await supabase
      .from('permissions')
      .update({ permission_level })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating permission:', error)
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating permission:', error)
    return NextResponse.json({ error: 'Failed to update permission' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First check if the permission exists
    const { data: permission, error: fetchError } = await supabase
      .from('permissions')
      .select('id, resource_id, resource_type')
      .eq('id', id)
      .single()

    if (fetchError || !permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
    }

    // Now check if user is the owner of the resource
    let isOwner = false
    
    if (permission.resource_type === 'folder') {
      const { data: folder } = await supabase
        .from('folders')
        .select('owner_id')
        .eq('id', permission.resource_id)
        .single()
      
      isOwner = folder?.owner_id === userId
    } else if (permission.resource_type === 'notebook') {
      const { data: notebook } = await supabase
        .from('notebooks')
        .select('owner_id')
        .eq('id', permission.resource_id)
        .single()
      
      isOwner = notebook?.owner_id === userId
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only resource owners can delete permissions' },
        { status: 403 }
      )
    }

    // Delete the permission
    const { error } = await supabase
      .from('permissions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting permission:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting permission:', error)
    return NextResponse.json({ error: 'Failed to delete permission' }, { status: 500 })
  }
}