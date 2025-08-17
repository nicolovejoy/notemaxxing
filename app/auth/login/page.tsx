'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { dataManager } from '@/lib/store/data-manager'
import { FormField } from '@/components/ui/FormField'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { LoadingButton } from '@/components/ui/LoadingButton'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [redirectTo, setRedirectTo] = useState<string>('/')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get redirect URL from query params
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirectTo')
    if (redirect) {
      setRedirectTo(redirect)
    }

    const checkSession = async () => {
      if (!supabase) return

      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push(redirect || '/')
        router.refresh()
      }
    }

    checkSession()
  }, [router, supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!supabase) {
      setError('Authentication is not configured. Please set up Supabase.')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Ensure session is properly established
      if (data.session) {
        // Small delay to ensure cookies are set
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Refresh data store to load user's data
        await dataManager.refresh()

        // Use replace to avoid back button issues
        router.replace(redirectTo)
        router.refresh()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-light italic">Notemaxxing</h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">Welcome back</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href={
                redirectTo !== '/'
                  ? `/auth/signup?redirectTo=${encodeURIComponent(redirectTo)}`
                  : '/auth/signup'
              }
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <FormField
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              label="Email address"
            />
            <FormField
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              label="Password"
            />
          </div>

          {error && <StatusMessage type="error" message={error} />}

          <LoadingButton
            type="submit"
            loading={loading}
            loadingText="Signing in..."
            fullWidth
            variant="primary"
          >
            Sign in
          </LoadingButton>
        </form>
      </div>
    </div>
  )
}
