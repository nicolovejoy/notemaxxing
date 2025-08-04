import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api/supabase-server-helpers'

export async function POST(request: NextRequest) {
  try {
    console.log('[Generate Link] Starting request')
    
    // Parse request body first to check what we're receiving
    let body;
    try {
      body = await request.json()
      console.log('[Generate Link] Raw request body:', JSON.stringify(body))
    } catch (parseError) {
      console.error('[Generate Link] Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      )
    }
    
    console.log('[Generate Link] Authenticated user:', user.id, user.email)

    // Validate input
    if (!resourceType || !resourceId || !permission || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check if user is trying to share with themselves
    console.log('[Generate Link] Checking self-invitation for user:', user.id, 'user email:', user.email)
    
    // First try to use the email from the auth user object
    if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
      console.log('[Generate Link] User trying to share with themselves (auth email match)')
      return NextResponse.json(
        { error: 'You cannot share with yourself' },
        { status: 400 }
      )
    }
    
    // Also check profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('[Generate Link] Error fetching profile:', profileError)
    } else {
      console.log('[Generate Link] Profile found:', profile)
    }
    
    if (profile?.email && profile.email.toLowerCase() === email.toLowerCase()) {
      console.log('[Generate Link] User trying to share with themselves (profile email match)')
      return NextResponse.json(
        { error: 'You cannot share with yourself' },
        { status: 400 }
      )
    }

    if (!['folder', 'notebook'].includes(resourceType)) {
      return NextResponse.json(
        { error: 'Invalid resource type' },
        { status: 400 }
      )
    }

    if (!['read', 'write'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission level' },
        { status: 400 }
      )
    }

    // Check if user owns the resource
    console.log('[Generate Link] Checking resource ownership')
    if (resourceType === 'folder') {
      const { data, error } = await supabase
        .from('folders')
        .select('id')
        .eq('id', resourceId)
        .eq('user_id', user.id)
        .single()
      
      if (error || !data) {
        console.error('[Generate Link] Folder not found or unauthorized:', error)
        return NextResponse.json(
          { error: 'Resource not found or unauthorized' },
          { status: 403 }
        )
      }
    } else {
      const { data, error } = await supabase
        .from('notebooks')
        .select('id')
        .eq('id', resourceId)
        .eq('user_id', user.id)
        .single()
      
      if (error || !data) {
        console.error('[Generate Link] Notebook not found or unauthorized:', error)
        return NextResponse.json(
          { error: 'Resource not found or unauthorized' },
          { status: 403 }
        )
      }
    }

    // Create invitation with specific email - expires in 7 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    
    const insertData = {
      resource_type: resourceType,
      resource_id: resourceId,
      invited_email: email.toLowerCase(),
      permission: permission,
      invited_by: user.id,
      expires_at: expiresAt.toISOString()
    }
    
    console.log('[Generate Link] Creating invitation with data:', insertData)
    
    const { data: invitation, error: inviteError } = await supabase
      .from('share_invitations')
      .insert(insertData)
      .select()
      .single()

    if (inviteError) {
      console.error('[Generate Link] Error creating invitation:', inviteError)
      
      // Check if it's a duplicate invitation error
      if (inviteError.code === '23505' && inviteError.message.includes('share_invitations_resource_id_invited_email_key')) {
        // Check if there's an existing active invitation
        const { data: existingInvitation } = await supabase
          .from('share_invitations')
          .select('*')
          .eq('resource_type', resourceType)
          .eq('resource_id', resourceId)
          .eq('invited_email', email.toLowerCase())
          .gte('expires_at', new Date().toISOString())
          .single()
        
        if (existingInvitation) {
          return NextResponse.json({
            success: true,
            invitationId: existingInvitation.id,
            expiresAt: existingInvitation.expires_at,
            existing: true
          })
        }
        
        return NextResponse.json(
          { error: 'An invitation already exists for this email and resource' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      expiresAt: invitation.expires_at,
    })

  } catch (error) {
    console.error('Unexpected error in generate share link:', error)
    // Log more details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}