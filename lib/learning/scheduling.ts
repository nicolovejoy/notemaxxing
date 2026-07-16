/**
 * Spaced repetition scheduling (SM-2 based).
 *
 * Pure: no DB, no SDK, no `new Date()`. `now` is always a parameter.
 */

import type { Quality, ResponseOutcome, SchedulingState } from './types'

const FAST_MS = 20_000
const MIN_EASE_FACTOR = 1.3
const MAX_EASE_FACTOR = 3.0
const DAY_MS = 24 * 60 * 60 * 1000

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Maps an app-level response outcome to an SM-2 quality score (0-5).
 * Deliberately not textbook SM-2 grading: partial adventure scores get their
 * own path, and plain quiz correctness is folded into fast/slow buckets.
 */
export function scoreToQuality(outcome: ResponseOutcome): Quality {
  if (outcome.abandoned || outcome.correct === null) {
    return 0
  }

  if (outcome.score !== null && outcome.score > 0 && outcome.score < 1) {
    return clamp(Math.round(outcome.score * 5), 0, 5) as Quality
  }

  if (outcome.correct === false) {
    return 2
  }

  // correct === true
  if (outcome.responseTimeMs !== null && outcome.responseTimeMs < FAST_MS) {
    return 5
  }

  return 4
}

/** Canonical SM-2 update. Returns a new state; never mutates the input. */
export function smUpdate(state: SchedulingState, quality: Quality, now: Date): SchedulingState {
  let repetitions: number
  let intervalDays: number

  if (quality >= 3) {
    repetitions = state.repetitions + 1
    if (state.repetitions === 0) {
      intervalDays = 1
    } else if (state.repetitions === 1) {
      intervalDays = 6
    } else {
      intervalDays = Math.round(state.intervalDays * state.easeFactor)
    }
  } else {
    repetitions = 0
    intervalDays = 1
  }

  const easeFactor = clamp(
    state.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    MIN_EASE_FACTOR,
    MAX_EASE_FACTOR
  )

  const dueAt = new Date(now.getTime() + intervalDays * DAY_MS)

  return {
    easeFactor,
    intervalDays,
    repetitions,
    dueAt,
    introducedAt: state.introducedAt ?? now,
    lastSeenAt: now,
  }
}
