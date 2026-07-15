import { describe, expect, it } from 'vitest'
import { scoreToQuality, smUpdate } from './scheduling'
import type { SchedulingState } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

function freshState(): SchedulingState {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: null,
    introducedAt: null,
    lastSeenAt: null,
  }
}

describe('smUpdate', () => {
  it('first q=5 review: EF 2.5 -> 2.6, repetitions 1, intervalDays 1', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const next = smUpdate(freshState(), 5, now)

    expect(next.easeFactor).toBeCloseTo(2.6, 5)
    expect(next.repetitions).toBe(1)
    expect(next.intervalDays).toBe(1)
  })

  it('second q=5 review: repetitions 2, intervalDays 6, EF ~2.7', () => {
    const now1 = new Date('2026-01-01T00:00:00.000Z')
    const now2 = new Date('2026-01-02T00:00:00.000Z')
    const first = smUpdate(freshState(), 5, now1)
    const second = smUpdate(first, 5, now2)

    expect(second.repetitions).toBe(2)
    expect(second.intervalDays).toBe(6)
    expect(second.easeFactor).toBeCloseTo(2.7, 5)
  })

  it('third q=5 review: intervalDays = round(6 * EF)', () => {
    const now1 = new Date('2026-01-01T00:00:00.000Z')
    const now2 = new Date('2026-01-02T00:00:00.000Z')
    const now3 = new Date('2026-01-08T00:00:00.000Z')
    const first = smUpdate(freshState(), 5, now1)
    const second = smUpdate(first, 5, now2)
    const third = smUpdate(second, 5, now3)

    expect(third.repetitions).toBe(3)
    expect(third.intervalDays).toBe(Math.round(6 * second.easeFactor))
  })

  it('q=2 resets repetitions to 0, intervalDays to 1, and decreases EF', () => {
    const now1 = new Date('2026-01-01T00:00:00.000Z')
    const now2 = new Date('2026-01-02T00:00:00.000Z')
    const now3 = new Date('2026-01-08T00:00:00.000Z')
    const first = smUpdate(freshState(), 5, now1)
    const second = smUpdate(first, 5, now2)
    const third = smUpdate(second, 2, now3)

    expect(third.repetitions).toBe(0)
    expect(third.intervalDays).toBe(1)
    expect(third.easeFactor).toBeLessThan(second.easeFactor)
  })

  it('q=2 from the very first review also resets/decreases correctly', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const next = smUpdate(freshState(), 2, now)

    expect(next.repetitions).toBe(0)
    expect(next.intervalDays).toBe(1)
    expect(next.easeFactor).toBeLessThan(2.5)
  })

  it('repeated q=0 floors EF at 1.3 and never goes below', () => {
    let state = freshState()
    const base = new Date('2026-01-01T00:00:00.000Z')
    for (let i = 0; i < 30; i++) {
      const now = new Date(base.getTime() + i * DAY_MS)
      state = smUpdate(state, 0, now)
      expect(state.easeFactor).toBeGreaterThanOrEqual(1.3)
    }
    expect(state.easeFactor).toBeCloseTo(1.3, 5)
  })

  it('repeated q=5 ceilings EF at 3.0 and never exceeds it', () => {
    let state = freshState()
    const base = new Date('2026-01-01T00:00:00.000Z')
    for (let i = 0; i < 30; i++) {
      const now = new Date(base.getTime() + i * DAY_MS)
      state = smUpdate(state, 5, now)
      expect(state.easeFactor).toBeLessThanOrEqual(3.0)
    }
    expect(state.easeFactor).toBeCloseTo(3.0, 5)
  })

  it('sets introducedAt on the first update', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const next = smUpdate(freshState(), 4, now)

    expect(next.introducedAt).toEqual(now)
  })

  it('preserves introducedAt on subsequent updates rather than overwriting it', () => {
    const now1 = new Date('2026-01-01T00:00:00.000Z')
    const now2 = new Date('2026-01-05T00:00:00.000Z')
    const first = smUpdate(freshState(), 4, now1)
    const second = smUpdate(first, 5, now2)

    expect(second.introducedAt).toEqual(now1)
  })

  it('sets dueAt to now + intervalDays days via exact ms arithmetic', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const next = smUpdate(freshState(), 5, now)

    expect(next.dueAt).not.toBeNull()
    expect(next.dueAt!.getTime()).toBe(now.getTime() + next.intervalDays * DAY_MS)
  })

  it('sets lastSeenAt to now', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const next = smUpdate(freshState(), 4, now)

    expect(next.lastSeenAt).toEqual(now)
  })

  it('does not mutate the input state object', () => {
    const state = freshState()
    const snapshot = { ...state }
    const now = new Date('2026-01-01T00:00:00.000Z')

    smUpdate(state, 5, now)

    expect(state).toEqual(snapshot)
  })

  it('returns a new object, not the same reference', () => {
    const state = freshState()
    const now = new Date('2026-01-01T00:00:00.000Z')
    const next = smUpdate(state, 5, now)

    expect(next).not.toBe(state)
  })
})

describe('scoreToQuality', () => {
  it('abandoned session -> 0', () => {
    expect(
      scoreToQuality({ correct: null, score: null, responseTimeMs: null, abandoned: true })
    ).toBe(0)
  })

  it('correct is null (never answered, not marked abandoned) -> 0', () => {
    expect(
      scoreToQuality({ correct: null, score: null, responseTimeMs: 5000, abandoned: false })
    ).toBe(0)
  })

  it('correct and fast (under 20s) -> 5', () => {
    expect(
      scoreToQuality({ correct: true, score: null, responseTimeMs: 19999, abandoned: false })
    ).toBe(5)
  })

  it('correct and exactly at the 20s threshold -> 4 (not under threshold)', () => {
    expect(
      scoreToQuality({ correct: true, score: null, responseTimeMs: 20000, abandoned: false })
    ).toBe(4)
  })

  it('correct and slow (20s or more) -> 4', () => {
    expect(
      scoreToQuality({ correct: true, score: null, responseTimeMs: 45000, abandoned: false })
    ).toBe(4)
  })

  it('correct with null response time -> 4', () => {
    expect(
      scoreToQuality({ correct: true, score: null, responseTimeMs: null, abandoned: false })
    ).toBe(4)
  })

  it('incorrect -> 2', () => {
    expect(
      scoreToQuality({ correct: false, score: null, responseTimeMs: 3000, abandoned: false })
    ).toBe(2)
  })

  it('incorrect and slow -> still 2 (correctness beats timing)', () => {
    expect(
      scoreToQuality({ correct: false, score: null, responseTimeMs: 999, abandoned: false })
    ).toBe(2)
  })

  it('adventure partial score 0.8 -> round(4.0) = 4', () => {
    expect(
      scoreToQuality({ correct: true, score: 0.8, responseTimeMs: 1000, abandoned: false })
    ).toBe(4)
  })

  it('adventure partial score 0.3 -> round(1.5) = 2', () => {
    // Math.round(1.5) rounds half up (toward +Infinity) in JS -> 2.
    expect(
      scoreToQuality({ correct: false, score: 0.3, responseTimeMs: 1000, abandoned: false })
    ).toBe(2)
  })

  it('adventure partial score 0.5 -> round(2.5) = 3 (JS rounds .5 up)', () => {
    expect(
      scoreToQuality({ correct: true, score: 0.5, responseTimeMs: 1000, abandoned: false })
    ).toBe(3)
  })

  it('score of exactly 0 falls through to correct/incorrect logic, not the score path', () => {
    expect(
      scoreToQuality({ correct: true, score: 0, responseTimeMs: 1000, abandoned: false })
    ).toBe(5)
  })

  it('score of exactly 1 falls through to correct/incorrect logic, not the score path', () => {
    expect(
      scoreToQuality({ correct: false, score: 1, responseTimeMs: 1000, abandoned: false })
    ).toBe(2)
  })

  it('abandoned wins even when score/correct look successful', () => {
    expect(
      scoreToQuality({ correct: true, score: 0.9, responseTimeMs: 500, abandoned: true })
    ).toBe(0)
  })
})
