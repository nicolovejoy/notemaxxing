import { logger } from '@/lib/debug/logger'

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface SupabaseError {
  code?: string
  message?: string
}

export function handleSupabaseError(error: unknown, operation: string): never {
  logger.error(`Supabase ${operation} failed`, error)

  const err = error as SupabaseError

  // Check for common Supabase errors
  if (err?.code === 'PGRST301') {
    throw new ApiError('Not authenticated. Please sign in and try again.', 'AUTH_REQUIRED', error)
  }

  if (err?.code === '23505') {
    throw new ApiError(
      'This item already exists. Please use a different name.',
      'DUPLICATE_ENTRY',
      error
    )
  }

  if (err?.code === '42501') {
    throw new ApiError(
      'You do not have permission to perform this action.',
      'PERMISSION_DENIED',
      error
    )
  }

  if (err?.message?.includes('Failed to fetch')) {
    throw new ApiError(
      'Network error. Please check your connection and try again.',
      'NETWORK_ERROR',
      error
    )
  }

  // Generic error
  throw new ApiError(
    err?.message || `Failed to ${operation}. Please try again.`,
    'UNKNOWN_ERROR',
    error
  )
}
