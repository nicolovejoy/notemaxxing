import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api/supabase-server-helpers'

export async function POST(request: NextRequest) {
  return handleRevoke(request)
}

export async function DELETE(request: NextRequest) {
  return handleRevoke(request)
}

async function handleRevoke(request: NextRequest) {
  try {
    // Get authenticated client
    const { client: supabase, user, error } = await getAuthenticatedSupabaseClient()
    if (error) return error
    if (!supabase) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    // Parse request body
    const body = await request.json()
    const { permissionId } = body

    console.log('[Revoke API] Received request with permissionId:', permissionId)

    if (!permissionId) {
      return NextResponse.json({ error: 'Missing permission ID' }, { status: 400 })
    }

    // Get permission details - first try without the join to see if permission exists
    const { data: basicPermission, error: basicError } = await supabase
      .from('permissions')
      .select('*')
      .eq('id', permissionId)
      .single()

    console.log('[Revoke API] Basic permission lookup:', { basicPermission, error: basicError })

    if (basicError || !basicPermission) {
      console.error('[Revoke API] Permission not found:', { permissionId, error: basicError })
      return NextResponse.json(
        { error: 'Permission not found', details: basicError?.message },
        { status: 404 }
      )
    }

    // Now get with profile info
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select('*, profiles!permissions_user_id_fkey(email)')
      .eq('id', permissionId)
      .single()

    console.log('[Revoke API] Full permission lookup result:', { permission, error: permError })

    // Use basic permission if the join failed
    const permissionData = permission || basicPermission

    // Check if user is authorized to revoke
    // For now, only check if user owns the resource (granted_by might not exist)
    {
      // Additional check: is the user the owner of the resource?
      let isOwner = false

      if (permissionData.resource_type === 'folder') {
        const { data: folder } = await supabase
          .from('folders')
          .select('user_id')
          .eq('id', permissionData.resource_id)
          .single()

        isOwner = folder?.user_id === user.id
      } else if (permissionData.resource_type === 'notebook') {
        const { data: notebook } = await supabase
          .from('notebooks')
          .select('user_id')
          .eq('id', permissionData.resource_id)
          .single()

        isOwner = notebook?.user_id === user.id
      }

      if (!isOwner) {
        console.log('[Revoke API] User not authorized:', {
          userId: user.id,
          resourceOwnerId: isOwner,
        })
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
      return NextResponse.json({ error: 'Failed to revoke permission' }, { status: 500 })
    }

    // Also delete any pending invitations for the same resource/user combination
    if (permission?.profiles?.email) {
      await supabase
        .from('share_invitations')
        .delete()
        .eq('resource_type', permissionData.resource_type)
        .eq('resource_id', permissionData.resource_id)
        .eq('invited_email', permission.profiles.email)
        .is('accepted_at', null)
    }

    return NextResponse.json({
      success: true,
      message: 'Permission revoked successfully',
      revokedPermission: {
        resourceType: permissionData.resource_type,
        resourceId: permissionData.resource_id,
        userEmail: permission?.profiles?.email,
      },
    })
  } catch (error) {
    console.error('Unexpected error in revoke permission:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
