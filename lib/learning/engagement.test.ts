import { describe, expect, it } from 'vitest'
import { computeSkipStreakDelta, signalToEngagement, updateEngagement } from './engagement'
import type { EngagementSignal } from './types'

function signal(overrides: Partial<EngagementSignal> = {}): EngagementSignal {
  return { emailOpened: false, linkClicked: false, completed: false, ...overrides }
}

describe('signalToEngagement', () => {
  it('completed -> 1.0', () => {
    expect(signalToEngagement(signal({ emailOpened: true, linkClicked: true, completed: true }))).toBe(
      1.0
    )
  })

  it('linkClicked but not completed -> 0.5', () => {
    expect(signalToEngagement(signal({ emailOpened: true, linkClicked: true, completed: false }))).toBe(
      0.5
    )
  })

  it('emailOpened only -> 0.2', () => {
    expect(signalToEngagement(signal({ emailOpened: true }))).toBe(0.2)
  })

  it('nothing -> 0.0', () => {
    expect(signalToEngagement(signal())).toBe(0.0)
  })
})

describe('updateEngagement', () => {
  it('converges toward 1.0 under repeated completion', () => {
    let current = 0
    for (let i = 0; i < 50; i++) {
      current = updateEngagement(current, signal({ completed: true }))
    }
    expect(current).toBeGreaterThan(0.99)
  })

  it('converges toward 0 under repeated ignoring', () => {
    let current = 1
    for (let i = 0; i < 50; i++) {
      current = updateEngagement(current, signal())
    }
    expect(current).toBeLessThan(0.01)
  })

  it('never exceeds 1 or drops below 0 across a long sequence', () => {
    let current = 0.5
    const signals = [
      signal({ completed: true }),
      signal(),
      signal({ linkClicked: true }),
      signal({ emailOpened: true }),
    ]
    for (let i = 0; i < 50; i++) {
      current = updateEngagement(current, signals[i % signals.length])
      expect(current).toBeLessThanOrEqual(1)
      expect(current).toBeGreaterThanOrEqual(0)
    }
  })

  it('alpha=1 takes the observation wholesale', () => {
    expect(updateEngagement(0.5, signal({ completed: true }), 1)).toBe(1.0)
    expect(updateEngagement(0.9, signal(), 1)).toBe(0.0)
  })

  it('alpha=0 never moves', () => {
    expect(updateEngagement(0.42, signal({ completed: true }), 0)).toBe(0.42)
    expect(updateEngagement(0.42, signal(), 0)).toBe(0.42)
  })

  it('defaults to alpha 0.3', () => {
    const next = updateEngagement(0.5, signal({ completed: true }))
    expect(next).toBeCloseTo(0.3 * 1.0 + 0.7 * 0.5, 10)
  })
})

describe('computeSkipStreakDelta', () => {
  it('status skipped -> delta 0, no flag, even if currentSkipStreak is already 2', () => {
    const result = computeSkipStreakDelta({
      deliveryStatus: 'skipped',
      signal: signal(),
      currentSkipStreak: 2,
    })
    expect(result).toEqual({
      skipStreakDelta: 0,
      resetSkipStreak: false,
      shouldFlag: false,
      shouldUnflag: false,
    })
  })

  it('status failed -> delta 0, no flag, even if currentSkipStreak is already 2', () => {
    const result = computeSkipStreakDelta({
      deliveryStatus: 'failed',
      signal: signal(),
      currentSkipStreak: 2,
    })
    expect(result).toEqual({
      skipStreakDelta: 0,
      resetSkipStreak: false,
      shouldFlag: false,
      shouldUnflag: false,
    })
  })

  it('status scheduled -> delta 0, no flag, even if currentSkipStreak is already 2', () => {
    const result = computeSkipStreakDelta({
      deliveryStatus: 'scheduled',
      signal: signal(),
      currentSkipStreak: 2,
    })
    expect(result).toEqual({
      skipStreakDelta: 0,
      resetSkipStreak: false,
      shouldFlag: false,
      shouldUnflag: false,
    })
  })

  it('sent + completed -> resetSkipStreak true, shouldUnflag true', () => {
    const result = computeSkipStreakDelta({
      deliveryStatus: 'sent',
      signal: signal({ emailOpened: true, linkClicked: true, completed: true }),
      currentSkipStreak: 5,
    })
    expect(result).toEqual({
      skipStreakDelta: 0,
      resetSkipStreak: true,
      shouldFlag: false,
      shouldUnflag: true,
    })
  })

  it('sent + opened-but-not-completed -> delta 1', () => {
    const result = computeSkipStreakDelta({
      deliveryStatus: 'sent',
      signal: signal({ emailOpened: true }),
      currentSkipStreak: 0,
    })
    expect(result.skipStreakDelta).toBe(1)
    expect(result.resetSkipStreak).toBe(false)
    expect(result.shouldUnflag).toBe(false)
  })

  it('sent + clicked-but-not-completed -> delta 1 (bailing mid-way is still a skip)', () => {
    const result = computeSkipStreakDelta({
      deliveryStatus: 'sent',
      signal: signal({ emailOpened: true, linkClicked: true }),
      currentSkipStreak: 0,
    })
    expect(result.skipStreakDelta).toBe(1)
    expect(result.resetSkipStreak).toBe(false)
    expect(result.shouldUnflag).toBe(false)
  })

  it('3rd consecutive skip (currentSkipStreak 2 -> 3) -> shouldFlag true', () => {
    const result = computeSkipStreakDelta({
      deliveryStatus: 'sent',
      signal: signal(),
      currentSkipStreak: 2,
    })
    expect(result.skipStreakDelta).toBe(1)
    expect(result.shouldFlag).toBe(true)
  })

  it('2nd consecutive skip (1 -> 2) -> shouldFlag false', () => {
    const result = computeSkipStreakDelta({
      deliveryStatus: 'sent',
      signal: signal(),
      currentSkipStreak: 1,
    })
    expect(result.skipStreakDelta).toBe(1)
    expect(result.shouldFlag).toBe(false)
  })

  it('already past threshold (currentSkipStreak 5) + skip -> shouldFlag stays true', () => {
    const result = computeSkipStreakDelta({
      deliveryStatus: 'sent',
      signal: signal(),
      currentSkipStreak: 5,
    })
    expect(result.skipStreakDelta).toBe(1)
    expect(result.shouldFlag).toBe(true)
  })

  it('custom flagThreshold respected', () => {
    const withCustomThreshold = computeSkipStreakDelta({
      deliveryStatus: 'sent',
      signal: signal(),
      currentSkipStreak: 1,
      flagThreshold: 2,
    })
    expect(withCustomThreshold.shouldFlag).toBe(true)

    const withDefaultThreshold = computeSkipStreakDelta({
      deliveryStatus: 'sent',
      signal: signal(),
      currentSkipStreak: 1,
    })
    expect(withDefaultThreshold.shouldFlag).toBe(false)
  })

  it('default flagThreshold is 3: 2nd skip does not flag, 3rd does', () => {
    const second = computeSkipStreakDelta({
      deliveryStatus: 'sent',
      signal: signal(),
      currentSkipStreak: 1,
    })
    expect(second.shouldFlag).toBe(false)

    const third = computeSkipStreakDelta({
      deliveryStatus: 'sent',
      signal: signal(),
      currentSkipStreak: 2,
    })
    expect(third.shouldFlag).toBe(true)
  })
})
