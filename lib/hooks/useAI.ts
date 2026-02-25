import { useState } from 'react'
import { apiFetch } from '@/lib/firebase/api-fetch'

interface UseAIReturn {
  enhance: (content: string) => Promise<string>
  isEnhancing: boolean
  error: string | null
}

export function useAI(): UseAIReturn {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enhance = async (content: string): Promise<string> => {
    setIsEnhancing(true)
    setError(null)

    try {
      const response = await apiFetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Error: ${response.status}`)
      }

      return data.enhanced
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enhance text'
      setError(message)
      throw new Error(message)
    } finally {
      setIsEnhancing(false)
    }
  }

  return { enhance, isEnhancing, error }
}
