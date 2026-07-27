import { describe, expect, it } from 'vitest'
import type { ConceptProgress, ScoreboardView } from '@/lib/handlers/respond'
import { formatProgress, formatScoreboard } from './format'

describe('formatProgress', () => {
  it('shows level and next review for an advanced concept', () => {
    const p: ConceptProgress = { name: 'Carbocation stability', repetitions: 3, intervalDays: 6 }
    expect(formatProgress(p)).toBe('Carbocation stability — level 3 · next review in 6 days')
  })

  it('singularizes a one-day interval', () => {
    const p: ConceptProgress = { name: 'Resonance', repetitions: 1, intervalDays: 1 }
    expect(formatProgress(p)).toBe('Resonance — level 1 · next review in 1 day')
  })

  it('rounds a fractional interval to whole days', () => {
    const p: ConceptProgress = { name: 'Hybridization', repetitions: 2, intervalDays: 5.6 }
    expect(formatProgress(p)).toBe('Hybridization — level 2 · next review in 6 days')
  })

  it('nudges gently when repetitions reset to zero', () => {
    const p: ConceptProgress = { name: 'Carbocation stability', repetitions: 0, intervalDays: 1 }
    expect(formatProgress(p)).toBe('Carbocation stability — back to basics, see it again soon')
  })
})

describe('formatScoreboard', () => {
  it('renders self as You and reports when you lead', () => {
    const s: ScoreboardView = {
      entries: [
        { name: 'Max', points: 8, self: true },
        { name: 'Nico', points: 6, self: false },
      ],
      leaderName: 'Max',
    }
    expect(formatScoreboard(s)).toBe('This week: You 8 · Nico 6 — you lead.')
  })

  it('reports when the other learner leads', () => {
    const s: ScoreboardView = {
      entries: [
        { name: 'Nico', points: 9, self: false },
        { name: 'Max', points: 6, self: true },
      ],
      leaderName: 'Nico',
    }
    expect(formatScoreboard(s)).toBe('This week: Nico 9 · You 6 — Nico leads.')
  })

  it('reports a tie', () => {
    const s: ScoreboardView = {
      entries: [
        { name: 'Max', points: 6, self: true },
        { name: 'Nico', points: 6, self: false },
      ],
      leaderName: null,
    }
    expect(formatScoreboard(s)).toBe('This week: You 6 · Nico 6 — tied.')
  })
})
