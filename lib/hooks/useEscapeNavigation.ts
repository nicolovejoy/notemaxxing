'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UseEscapeNavigationOptions {
  /** URL to navigate to on Escape. null = no-op (top of hierarchy). */
  parentUrl: string | null
  /** When true, the hook is disabled (modal/editor/dialog is open). */
  disabled: boolean
}

export function useEscapeNavigation({ parentUrl, disabled }: UseEscapeNavigationOptions): void {
  const router = useRouter()

  useEffect(() => {
    if (disabled || !parentUrl) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return

      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
        return
      }

      e.preventDefault()
      router.push(parentUrl)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [parentUrl, disabled, router])
}
