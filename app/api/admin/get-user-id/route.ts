import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api/supabase-server-helpers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Admin emails allowed to use this endpoint
const ADMIN_EMAILS = ['nicholas.lovejoy@gmail.com', 'mlovejoy@scu.edu']

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const { client: supabase, user, error } = await getAuthenticatedSupabaseClient()
    if (error) return error
    if (!supabase) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    // 2. Verify user is admin
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Get email from query params
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    // 4. Create service role client to query auth.users
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 5. Look up user by email
    const { data: users, error: lookupError } = await serviceClient
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (lookupError || !users) {
      // Try alternative approach using RPC function if available
      const { data: userData, error: rpcError } = await serviceClient.rpc('get_user_id_by_email', {
        user_email: email,
      })

      if (rpcError || !userData) {
        return NextResponse.json({ error: 'User not found', email }, { status: 404 })
      }

      return NextResponse.json({ userId: userData, email })
    }

    return NextResponse.json({ userId: users.id, email: users.email })
  } catch (error) {
    console.error('Admin get-user-id error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
