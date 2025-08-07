import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Admin emails allowed to use this endpoint
const ADMIN_EMAILS = [
  'nicholas.lovejoy@gmail.com', // Nico - Developer
  'mlovejoy@scu.edu' // Max - UX Designer & Co-developer
]

// Admin password - store this securely, ideally in environment variable
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify user is admin
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      console.warn(`Non-admin user attempted admin action: ${user.email}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Parse request body
    const body = await request.json()
    const { targetUserId, adminPassword } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })
    }

    // 4. Verify admin password
    if (adminPassword !== ADMIN_PASSWORD) {
      console.warn(`Invalid admin password attempt by: ${user.email}`)
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 })
    }

    // 5. Log the admin action
    console.log(`Admin action: ${user.email} resetting data for user ${targetUserId}`)

    // 6. Create service role client (bypasses RLS)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not set in environment variables')
      return NextResponse.json({ 
        error: 'Server configuration error', 
        details: 'Service role key not configured' 
      }, { status: 500 })
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 7. Get current data counts for logging
    const [folders, notebooks, notes] = await Promise.all([
      serviceClient.from('folders').select('id', { count: 'exact' }).eq('user_id', targetUserId),
      serviceClient.from('notebooks').select('id', { count: 'exact' }).eq('user_id', targetUserId),
      serviceClient.from('notes').select('id', { count: 'exact' }).eq('user_id', targetUserId)
    ])

    const beforeCounts = {
      folders: folders.count || 0,
      notebooks: notebooks.count || 0,
      notes: notes.count || 0
    }

    // 8. Delete all user data using service role (bypasses RLS)
    // Note: We delete in reverse dependency order
    const deleteOperations: Array<{
      table: string
      result: { error: Error | null; data: unknown }
      optional?: boolean
    }> = []
    
    // Delete notes first (depends on notebooks)
    const notesDelete = await serviceClient.from('notes').delete().eq('user_id', targetUserId)
    deleteOperations.push({ table: 'notes', result: notesDelete })
    
    // Delete quizzes (independent)
    const quizzesDelete = await serviceClient.from('quizzes').delete().eq('user_id', targetUserId)
    // Ignore errors for quizzes as table might not have any entries
    deleteOperations.push({ table: 'quizzes', result: quizzesDelete, optional: true })
    
    // Delete notebooks (depends on folders)
    const notebooksDelete = await serviceClient.from('notebooks').delete().eq('user_id', targetUserId)
    deleteOperations.push({ table: 'notebooks', result: notebooksDelete })
    
    // Delete folders
    const foldersDelete = await serviceClient.from('folders').delete().eq('user_id', targetUserId)
    deleteOperations.push({ table: 'folders', result: foldersDelete })
    
    // Clean up permissions and invitations
    const permissionsDelete = await serviceClient.from('permissions').delete().eq('user_id', targetUserId)
    deleteOperations.push({ table: 'permissions', result: permissionsDelete, optional: true })
    
    const invitationsDelete = await serviceClient.from('share_invitations').delete().eq('created_by', targetUserId)
    deleteOperations.push({ table: 'share_invitations', result: invitationsDelete, optional: true })

    // 9. Check for errors (ignoring optional tables)
    const failedOps = deleteOperations.filter(op => !op.optional && op.result.error)
    if (failedOps.length > 0) {
      const errorDetails = failedOps.map(op => ({
        table: op.table,
        error: op.result.error?.message,
        code: op.result.error?.code
      }))
      console.error('Delete operation failures:', errorDetails)
      return NextResponse.json({ 
        error: 'Some deletions failed', 
        details: errorDetails
      }, { status: 500 })
    }
    
    // Log any warnings from optional tables
    const optionalErrors = deleteOperations.filter(op => op.optional && op.result.error)
    if (optionalErrors.length > 0) {
      console.log('Optional table delete warnings (ignored):', optionalErrors.map(op => op.table))
    }

    // 10. Verify deletion
    const [foldersAfter, notebooksAfter, notesAfter] = await Promise.all([
      serviceClient.from('folders').select('id', { count: 'exact' }).eq('user_id', targetUserId),
      serviceClient.from('notebooks').select('id', { count: 'exact' }).eq('user_id', targetUserId),
      serviceClient.from('notes').select('id', { count: 'exact' }).eq('user_id', targetUserId)
    ])

    const afterCounts = {
      folders: foldersAfter.count || 0,
      notebooks: notebooksAfter.count || 0,
      notes: notesAfter.count || 0
    }

    // 11. Log the result
    console.log(`Admin action completed: Deleted ${beforeCounts.folders} folders, ${beforeCounts.notebooks} notebooks, ${beforeCounts.notes} notes for user ${targetUserId}`)

    return NextResponse.json({
      success: true,
      deleted: beforeCounts,
      remaining: afterCounts,
      targetUserId
    })

  } catch (error) {
    console.error('Admin reset error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}