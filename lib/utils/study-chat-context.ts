import type { StudyChatContext } from '@/lib/types/study'

const STORAGE_KEY = 'study-chat-context'

export function storeStudyChatContext(context: StudyChatContext) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context))
  }
}

export function getStudyChatContext(): StudyChatContext | null {
  if (typeof window === 'undefined') return null

  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as StudyChatContext
  } catch {
    return null
  }
}

export function clearStudyChatContext() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}
