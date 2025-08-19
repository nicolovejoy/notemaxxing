import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api/supabase-server-helpers'

export async function POST(request: NextRequest) {
  try {
    console.log('[Generate Link] Starting request')

    // Parse request body first to check what we're receiving
    let body
    try {
      body = await request.json()
      console.log('[Generate Link] Raw request body:', JSON.stringify(body))
    } catch (parseError) {
      console.error('[Generate Link] Failed to parse request body:', parseError)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { resourceType, resourceId, permission, email } = body
    console.log('[Generate Link] Parsed values:', { resourceType, resourceId, permission, email })

    // Get authenticated client
    const { client: supabase, user, error } = await getAuthenticatedSupabaseClient()
    if (error) {
      console.error('[Generate Link] Auth error:', error)
      return error
    }
    if (!supabase) {
      console.error('[Generate Link] No supabase client')
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    console.log('[Generate Link] Authenticated user:', user.id, user.email)

    // Validate input
    if (!resourceType || !resourceId || !permission || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Check if user is trying to share with themselves
    console.log(
      '[Generate Link] Checking self-invitation for user:',
      user.id,
      'user email:',
      user.email
    )

    // First try to use the email from the auth user object
    if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
      console.log('[Generate Link] User trying to share with themselves (auth email match)')
      return NextResponse.json({ error: 'You cannot share with yourself' }, { status: 400 })
    }

    // TODO: Add profiles table or database function to get user emails
    // The auth email check above should be sufficient for now
    // Removed profiles table check since the table doesn't exist

    if (!['folder', 'notebook'].includes(resourceType)) {
      return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 })
    }

    if (!['read', 'write'].includes(permission)) {
      return NextResponse.json({ error: 'Invalid permission level' }, { status: 400 })
    }

    // Check if user owns the resource
    console.log('[Generate Link] Checking resource ownership')
    if (resourceType === 'folder') {
      const { data, error } = await supabase
        .from('folders')
        .select('id')
        .eq('id', resourceId)
        .eq('owner_id', user.id)
        .single()

      if (error || !data) {
        console.error('[Generate Link] Folder not found or unauthorized:', error)
        return NextResponse.json({ error: 'Resource not found or unauthorized' }, { status: 403 })
      }
    } else {
      const { data, error } = await supabase
        .from('notebooks')
        .select('id, folder_id')
        .eq('id', resourceId)
        .eq('owner_id', user.id)
        .single()

      if (error || !data) {
        console.error('[Generate Link] Notebook not found or unauthorized:', error)
        return NextResponse.json({ error: 'Resource not found or unauthorized' }, { status: 403 })
      }

      // Check if the parent folder is shared - folder-first sharing model
      // Notebooks can only be shared within already-shared folders
      const { data: folderPermissions } = await supabase
        .from('permissions')
        .select('id')
        .eq('resource_id', data.folder_id)
        .eq('resource_type', 'folder')
        .eq('granted_by', user.id)

      if (!folderPermissions || folderPermissions.length === 0) {
        console.error('[Generate Link] Cannot share notebook - parent folder is not shared')
        return NextResponse.json(
          {
            error: 'Cannot share notebook. Please share the parent folder first.',
          },
          { status: 400 }
        )
      }
    }

    // Get resource name for the public preview
    let resourceName = 'Shared Resource'
    if (resourceType === 'folder') {
      const { data: folder } = await supabase
        .from('folders')
        .select('name')
        .eq('id', resourceId)
        .single()
      resourceName = folder?.name || 'Shared Folder'
    } else if (resourceType === 'notebook') {
      const { data: notebook } = await supabase
        .from('notebooks')
        .select('name')
        .eq('id', resourceId)
        .single()
      resourceName = notebook?.name || 'Shared Notebook'
    }

    console.log('[Generate Link] Creating invitation for:', resourceName)

    // Check for existing invitation first
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('invitee_email', email.toLowerCase())
      .is('accepted_at', null) // Not yet accepted
      .single()

    if (existingInvitation) {
      console.log('[Generate Link] Found existing invitation, updating expiry')
      
      // Update expiry date to extend invitation
      const newExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ expires_at: newExpiryDate })
        .eq('id', existingInvitation.id)
      
      if (updateError) {
        console.error('[Generate Link] Error updating invitation:', updateError)
        return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 })
      }

      // Also update the public preview
      await supabase
        .from('public_invitation_previews')
        .upsert({
          token: existingInvitation.token,
          resource_name: resourceName,
          resource_type: resourceType,
          inviter_name: user.email || 'A user',
          expires_at: newExpiryDate,
        }, { onConflict: 'token' })

      return NextResponse.json({
        success: true,
        invitationId: existingInvitation.token, // Return token as ID for URL
        expiresAt: newExpiryDate,
        existing: true,
      })
    }

    // Create new invitation with explicit field values
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        token,
        resource_id: resourceId,
        resource_type: resourceType,
        permission_level: permission, // Note: permission_level, not permission
        invitee_email: email.toLowerCase(),
        invited_by: user.id,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (inviteError) {
      console.error('[Generate Link] Error creating invitation:', inviteError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Create public preview for non-authenticated users
    const { error: previewError } = await supabase
      .from('public_invitation_previews')
      .insert({
        token: invitation.token,
        resource_name: resourceName,
        resource_type: resourceType,
        inviter_name: user.email || 'A user',
        expires_at: expiresAt
      })

    if (previewError) {
      console.error('[Generate Link] Error creating public preview:', previewError)
      // Non-fatal: invitation still works without preview
    }

    return NextResponse.json({
      success: true,
      invitationId: invitation.token, // Return token as ID for URL
      expiresAt: invitation.expires_at,
    })
  } catch (error) {
    console.error('Unexpected error in generate share link:', error)
    // Log more details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error,
      })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
