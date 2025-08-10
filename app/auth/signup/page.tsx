'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setupNewUser } from '@/lib/auth/setup-new-user'
import { FormField } from '@/components/ui/FormField'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { LoadingButton } from '@/components/ui/LoadingButton'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!supabase) {
      setError('Authentication is not configured. Please set up Supabase.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation is enabled
        setError('Check your email for the confirmation link!')
        return
      }

      // If we have a session, user is logged in (email confirmation is disabled)
      if (data.session && data.user) {
        // Set up the new user's profile and role
        const setupResult = await setupNewUser(data.user.id, data.user.email!)

        if (!setupResult.success) {
          console.error('Failed to set up user profile:', setupResult.error)
          // Continue anyway - the user is created, just missing profile/role
        }

        router.push('/')
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
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4">
            <FormField
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <FormField
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              error={
                password.length > 0 && password.length < 6
                  ? 'Password must be at least 6 characters'
                  : undefined
              }
            />
            <FormField
              label="Confirm password"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              error={
                confirmPassword && confirmPassword !== password
                  ? "Passwords don't match"
                  : undefined
              }
            />
          </div>

          {error && (
            <StatusMessage
              type={error.includes('Check your email') ? 'success' : 'error'}
              message={error}
            />
          )}

          <LoadingButton
            type="submit"
            loading={loading}
            loadingText="Creating account..."
            fullWidth
            variant="primary"
          >
            Create account
          </LoadingButton>
        </form>
      </div>
    </div>
  )
}
