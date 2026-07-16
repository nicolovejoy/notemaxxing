'use client'

import { useState } from 'react'
import type { Reveal } from '@/lib/handlers/respond'

type Props = {
  token: string
  options: string[]
  /** Non-null when they've already answered — the form renders read-only. */
  initialReveal: Reveal | null
}

export function QuizForm({ token, options, initialReveal }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [reveal, setReveal] = useState<Reveal | null>(initialReveal)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const answered = reveal !== null

  async function submit() {
    if (selected === null || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/learn/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, chosenIndex: selected }),
      })
      if (!res.ok) {
        setError("That didn't go through. Try again?")
        return
      }
      const data = await res.json()
      setReveal(data.reveal)
    } catch {
      setError("That didn't go through. Try again?")
    } finally {
      setSubmitting(false)
    }
  }

  // This surface is deliberately single-theme: it's the landing page for a click
  // from the daily email, and that email is always cream+navy. Fixed brand hex,
  // NOT the app's theme-reactive tokens (which invert under OS dark mode and
  // buried the option text in near-white on white).
  function optionClass(i: number): string {
    const base =
      'w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-start gap-3'
    if (!answered) {
      return selected === i
        ? `${base} border-[#1A3C6B] bg-[#EEF3F9] shadow-sm cursor-pointer`
        : `${base} border-[#E5E7EB] bg-white hover:border-[#4A6E91] cursor-pointer`
    }
    if (i === reveal!.correctIndex) return `${base} border-[#16A34A] bg-[#F0FDF4]`
    if (i === reveal!.chosenIndex) return `${base} border-[#EF4444] bg-[#FEF2F2]`
    return `${base} border-[#E5E7EB] bg-[#F3F4F6]`
  }

  /** The A/B/C/D badge doubles as the selection/result indicator. */
  function badgeClass(i: number): string {
    const base =
      'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors'
    if (!answered) {
      return selected === i
        ? `${base} bg-[#1A3C6B] text-white`
        : `${base} bg-[#EEF1F5] text-[#4A6E91]`
    }
    if (i === reveal!.correctIndex) return `${base} bg-[#16A34A] text-white`
    if (i === reveal!.chosenIndex) return `${base} bg-[#EF4444] text-white`
    return `${base} bg-[#E5E7EB] text-[#9CA3AF]`
  }

  /** Text color per row — the fix: always a real ink, never a token that inverts. */
  function labelClass(i: number): string {
    if (!answered) return 'text-[#1F2933]'
    if (i === reveal!.correctIndex || i === reveal!.chosenIndex) return 'text-[#1F2933]'
    return 'text-[#9CA3AF]'
  }

  function badgeLabel(i: number): string {
    if (answered && i === reveal!.correctIndex) return '✓'
    if (answered && i === reveal!.chosenIndex) return '✕'
    return String.fromCharCode(65 + i)
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {options.map((option, i) => (
          <button
            key={i}
            type="button"
            disabled={answered || submitting}
            onClick={() => setSelected(i)}
            className={optionClass(i)}
            aria-pressed={selected === i}
          >
            <span className={badgeClass(i)}>{badgeLabel(i)}</span>
            <span className={`${labelClass(i)} mt-0.5`}>{option}</span>
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-[#DC2626]">{error}</p>}

      {!answered && (
        <button
          type="button"
          onClick={submit}
          disabled={selected === null || submitting}
          className="mt-6 px-7 py-3 rounded-md bg-[#1A3C6B] text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      )}

      {answered && (
        <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
          <p className="font-semibold text-[#1F2933]">
            {reveal!.correct ? 'Correct.' : 'Not quite.'}
          </p>
          {reveal!.explanation && (
            <p className="mt-2 leading-relaxed text-[#374151]">{reveal!.explanation}</p>
          )}
          <p className="mt-6 text-sm text-[#4A6E91]">That&rsquo;s it for today.</p>
        </div>
      )}
    </div>
  )
}
