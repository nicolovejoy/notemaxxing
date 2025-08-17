import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { resourceIds, resourceType } = await request.json()

    if (!resourceIds || !Array.isArray(resourceIds) || resourceIds.length === 0) {
      return NextResponse.json({ error: 'Invalid resource IDs' }, { status: 400 })
    }

    // Use RPC function to get permissions (bypasses RLS)
    const { data: permissions, error } = await supabase.rpc('get_resource_permissions', {
      resource_ids: resourceIds,
      resource_type_param: resourceType || null,
    })

    if (error) {
      console.error('Error fetching permissions via RPC:', error)
      // Fallback to direct query if RPC doesn't exist
      const { data: directPerms, error: directError } = await supabase
        .from('permissions')
        .select('*')
        .in('resource_id', resourceIds)

      if (directError) {
        console.error('Error fetching permissions directly:', directError)
        return NextResponse.json({ permissions: [] })
      }

      return NextResponse.json({ permissions: directPerms || [] })
    }

    return NextResponse.json({ permissions: permissions || [] })
  } catch (error) {
    console.error('Error in permissions endpoint:', error)
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
  }
}
