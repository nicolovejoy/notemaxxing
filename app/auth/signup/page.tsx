'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Signup is handled via Google sign-in on the login page
export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirectTo = searchParams.get('redirectTo')
    router.replace(redirectTo ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/auth/login')
  }, [router, searchParams])

  return null
}
