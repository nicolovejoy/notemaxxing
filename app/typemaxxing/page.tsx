'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { NotebookPicker } from '@/components/study/NotebookPicker'
import { useAuth } from '@/lib/hooks/useAuth'
import { apiFetch } from '@/lib/firebase/api-fetch'
import type { StudySource, TypingResponse } from '@/lib/types/study'

type Phase = 'select' | 'loading' | 'typing' | 'results'

export default function TypemaxxingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [phase, setPhase] = useState<Phase>('select')
  const [source, setSource] = useState<StudySource | null>(null)
  const [passage, setPassage] = useState('')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  const generate = useCallback(async (src: StudySource) => {
    setSource(src)
    setPhase('loading')
    setError('')

    try {
      const res = await apiFetch('/api/study/generate', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'typing',
          ...(src.type === 'notebook' ? { notebookId: src.notebookId } : { topic: src.topic }),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate passage')
      }

      const data: TypingResponse = await res.json()
      setPassage(data.text)
      setTyped('')
      setStartTime(null)
      setEndTime(null)
      setPhase('typing')
      // Focus the hidden textarea after render
      setTimeout(() => textareaRef.current?.focus(), 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('select')
    }
  }, [])

  const handleInput = useCallback(
    (value: string) => {
      if (!passage) return

      // Start timer on first keystroke
      if (!startTime) setStartTime(Date.now())

      // Don't allow typing past the passage length
      if (value.length > passage.length) return

      setTyped(value)

      // Check if complete
      if (value.length === passage.length) {
        setEndTime(Date.now())
        setPhase('results')
      }
    },
    [passage, startTime]
  )

  // Compute stats
  const computeStats = () => {
    if (!startTime || !endTime || !passage) return { wpm: 0, accuracy: 0 }
    const minutes = (endTime - startTime) / 60000
    const wordCount = passage.split(/\s+/).length
    const wpm = Math.round(wordCount / minutes)
    let correct = 0
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === passage[i]) correct++
    }
    const accuracy = Math.round((correct / passage.length) * 100)
    return { wpm, accuracy }
  }

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader breadcrumbs={[{ label: 'Typemaxxing' }]} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {phase === 'select' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Choose your source</h2>
            <p className="text-sm text-gray-500 mb-6">
              Pick a notebook or enter a topic to generate a typing passage.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
            )}
            <NotebookPicker onSelect={generate} />
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Generating passage...</p>
          </div>
        )}

        {phase === 'typing' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {source?.type === 'notebook'
                  ? `From: ${source.notebookName}`
                  : `Topic: ${source?.type === 'topic' ? source.topic : ''}`}
              </p>
              <p className="text-sm text-gray-400">
                {typed.length}/{passage.length} characters
              </p>
            </div>

            {/* Passage display */}
            <div
              className="font-mono text-lg leading-relaxed bg-white p-6 rounded-lg border border-gray-200 mb-4 cursor-text select-none"
              onClick={() => textareaRef.current?.focus()}
            >
              {passage.split('').map((char, i) => {
                let className = 'text-gray-300' // pending
                if (i < typed.length) {
                  className = typed[i] === char ? 'text-green-600' : 'text-red-500 bg-red-50'
                }
                // Current position cursor
                if (i === typed.length) {
                  className += ' border-l-2 border-blue-500'
                }
                return (
                  <span key={i} className={className}>
                    {char}
                  </span>
                )
              })}
            </div>

            {/* Hidden textarea for capturing input */}
            <textarea
              ref={textareaRef}
              value={typed}
              onChange={(e) => handleInput(e.target.value)}
              className="sr-only"
              autoFocus
              aria-label="Type the passage here"
            />

            <p className="text-xs text-gray-400 text-center">
              Click the text above if typing stops working
            </p>
          </div>
        )}

        {phase === 'results' &&
          (() => {
            const { wpm, accuracy } = computeStats()
            return (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Results</h2>

                <div className="flex justify-center gap-12 mb-10">
                  <div>
                    <p className="text-4xl font-bold text-blue-600">{wpm}</p>
                    <p className="text-sm text-gray-500 mt-1">WPM</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-green-600">{accuracy}%</p>
                    <p className="text-sm text-gray-500 mt-1">Accuracy</p>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => source && generate(source)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next passage
                  </button>
                  <button
                    onClick={() => {
                      setPhase('select')
                      setSource(null)
                      setError('')
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    New source
                  </button>
                </div>
              </div>
            )
          })()}
      </main>
    </div>
  )
}
