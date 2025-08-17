import { createClient } from './server'
import { logger } from '@/lib/debug/logger'

export async function getCurrentUser() {
  const supabase = await createClient()
  if (!supabase) {
    logger.error('Cannot get current user - Supabase client not available')
    return null
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) {
      logger.error('Failed to get current user', error)
      return null
    }
    return user
  } catch (error) {
    logger.error('Error getting current user', error)
    return null
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id || null
}
