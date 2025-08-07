import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { permissionId } = body

    if (!permissionId) {
      return NextResponse.json(
        { error: 'Missing permission ID' },
        { status: 400 }
      )
    }

    // Get permission details
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select('*, profiles!permissions_user_id_fkey(email)')
      .eq('id', permissionId)
      .single()

    if (permError || !permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      )
    }

    // Check if user is authorized to revoke
    // For now, only check if user owns the resource (granted_by might not exist)
    {
      // Additional check: is the user the owner of the resource?
      let isOwner = false
      
      if (permission.resource_type === 'folder') {
        const { data: folder } = await supabase
          .from('folders')
          .select('user_id')
          .eq('id', permission.resource_id)
          .single()
        
        isOwner = folder?.user_id === user.id
      } else if (permission.resource_type === 'notebook') {
        const { data: notebook } = await supabase
          .from('notebooks')
          .select('user_id')
          .eq('id', permission.resource_id)
          .single()
        
        isOwner = notebook?.user_id === user.id
      }

      if (!isOwner) {
        return NextResponse.json(
          { error: 'You are not authorized to revoke this permission' },
          { status: 403 }
        )
      }
    }

    // Delete the permission
    const { error: deleteError } = await supabase
      .from('permissions')
      .delete()
      .eq('id', permissionId)

    if (deleteError) {
      console.error('Error deleting permission:', deleteError)
      return NextResponse.json(
        { error: 'Failed to revoke permission' },
        { status: 500 }
      )
    }

    // Also delete any pending invitations for the same resource/user combination
    if (permission.profiles?.email) {
      await supabase
        .from('share_invitations')
        .delete()
        .eq('resource_type', permission.resource_type)
        .eq('resource_id', permission.resource_id)
        .eq('invited_email', permission.profiles.email)
        .is('accepted_at', null)
    }

    return NextResponse.json({
      success: true,
      message: 'Permission revoked successfully',
      revokedPermission: {
        resourceType: permission.resource_type,
        resourceId: permission.resource_id,
        userEmail: permission.profiles?.email
      }
    })

  } catch (error) {
    console.error('Unexpected error in revoke permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}