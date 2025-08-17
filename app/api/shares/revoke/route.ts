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

    // TODO: Add profiles table or database function to get user emails
    // For now, we'll just use the basic permission data
    const permissionData = basicPermission

    // Check if user is authorized to revoke
    // For now, only check if user owns the resource (granted_by might not exist)
    {
      // Additional check: is the user the owner of the resource?
      let isOwner = false

      if (permissionData.resource_type === 'folder') {
        const { data: folder } = await supabase
          .from('folders')
          .select('owner_id')
          .eq('id', permissionData.resource_id)
          .single()

        isOwner = folder?.owner_id === user.id
      } else if (permissionData.resource_type === 'notebook') {
        const { data: notebook } = await supabase
          .from('notebooks')
          .select('owner_id')
          .eq('id', permissionData.resource_id)
          .single()

        isOwner = notebook?.owner_id === user.id
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

    // TODO: Also delete pending invitations once we can lookup user emails

    return NextResponse.json({
      success: true,
      message: 'Permission revoked successfully',
      revokedPermission: {
        resourceType: permissionData.resource_type,
        resourceId: permissionData.resource_id,
        userId: permissionData.user_id,
      },
    })
  } catch (error) {
    console.error('Unexpected error in revoke permission:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
