import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const userId = await getCurrentUserId()
    
    // Debug logging
    console.log('=== FOLDER CREATE DEBUG ===')
    console.log('1. userId from getCurrentUserId():', userId)
    
    // Check auth session directly
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('2. Session exists:', !!session)
    console.log('3. Session user ID:', session?.user?.id)
    console.log('4. Session error:', sessionError)
    
    // Check what auth.uid() would return in RLS
    const { data: authCheck, error: authError } = await supabase
      .rpc('auth.uid')
      .single()
    console.log('5. auth.uid() result:', authCheck)
    console.log('6. auth.uid() error:', authError)

    if (!userId) {
      console.log('7. Returning 401 - no userId')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, color } = body

    if (!name || !color) {
      return NextResponse.json({ error: 'Name and color are required' }, { status: 400 })
    }

    console.log('8. Attempting insert with owner_id:', userId)
    const { data, error } = await supabase
      .from('folders')
      .insert({
        name,
        color,
        owner_id: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('9. Error creating folder:', error)
      console.error('10. Full error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in folder creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
