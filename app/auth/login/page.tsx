'use client'

import { useState, useEffect } from 'react'
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { useRouter } from 'next/navigation'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { LoadingButton } from '@/components/ui/LoadingButton'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [redirectTo, setRedirectTo] = useState<string>('/')
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirectTo')
    if (redirect) setRedirectTo(redirect)

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.push(redirect || '/')
    })
    return () => unsubscribe()
  }, [router])

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      router.replace(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-light italic">Notemaxxing</h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">Welcome</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Sign in to continue</p>
        </div>

        {error && <StatusMessage type="error" message={error} />}

        <LoadingButton
          type="button"
          loading={loading}
          loadingText="Signing in..."
          fullWidth
          variant="primary"
          onClick={handleGoogleSignIn}
        >
          Sign in with Google
        </LoadingButton>
      </div>
    </div>
  )
}
