import { createClient } from '@/lib/supabase/client'

export async function setupNewUser(userId: string, email: string) {
  const supabase = createClient()
  
  if (!supabase) {
    console.error('Supabase client not initialized')
    return { success: false, error: 'Supabase client not initialized' }
  }
  
  try {
    // Create profile entry
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
      })
      .select()
      .single()
    
    if (profileError && profileError.code !== '23505') { // 23505 is duplicate key error
      console.error('Error creating profile:', profileError)
      throw profileError
    }
    
    // Create user_roles entry
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'user',
      })
      .select()
      .single()
    
    if (roleError && roleError.code !== '23505') {
      console.error('Error creating user role:', roleError)
      throw roleError
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error setting up new user:', error)
    return { success: false, error }
  }
}