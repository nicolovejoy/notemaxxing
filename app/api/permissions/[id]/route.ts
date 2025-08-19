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

    if (!permission_level || !['view', 'write'].includes(permission_level)) {
      return NextResponse.json(
        { error: 'Invalid permission level. Must be "view" or "write"' },
        { status: 400 }
      )
    }

    // First check if the user has permission to update this permission
    // They must be the owner of the resource
    const { data: permission, error: fetchError } = await supabase
      .from('permissions')
      .select(`
        id,
        resource_id,
        resource_type,
        folders!inner(owner_id),
        notebooks!inner(owner_id)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
    }

    // Check if user is the owner of the resource
    const isOwner = 
      (permission.resource_type === 'folder' && permission.folders?.owner_id === userId) ||
      (permission.resource_type === 'notebook' && permission.notebooks?.owner_id === userId)

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

    // First check if the user has permission to delete this permission
    // They must be the owner of the resource
    const { data: permission, error: fetchError } = await supabase
      .from('permissions')
      .select(`
        id,
        resource_id,
        resource_type,
        folders!inner(owner_id),
        notebooks!inner(owner_id)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
    }

    // Check if user is the owner of the resource
    const isOwner = 
      (permission.resource_type === 'folder' && permission.folders?.owner_id === userId) ||
      (permission.resource_type === 'notebook' && permission.notebooks?.owner_id === userId)

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