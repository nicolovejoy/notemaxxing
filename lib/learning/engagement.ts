/**
 * Engagement scoring and skip-streak flagging.
 *
 * Pure: no DB, no SDK, no `new Date()`.
 *
 * "Flagged, not dropped": flagging is a scoring input only — the selector
 * never filters a concept out for being flagged. This module just decides
 * when the flag goes up and down.
 */

import type { EngagementSignal, SkipStreakDecision } from './types'

const DEFAULT_ALPHA = 0.3
const DEFAULT_FLAG_THRESHOLD = 3

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Maps a raw engagement signal to a [0,1] observation. */
export function signalToEngagement(signal: EngagementSignal): number {
  if (signal.completed) {
    return 1.0
  }
  if (signal.linkClicked) {
    return 0.5
  }
  if (signal.emailOpened) {
    return 0.2
  }
  return 0.0
}

/** EWMA update of the engagement score. Bounded to [0,1]. */
export function updateEngagement(
  current: number,
  signal: EngagementSignal,
  alpha: number = DEFAULT_ALPHA
): number {
  const observation = signalToEngagement(signal)
  const next = alpha * observation + (1 - alpha) * current
  return clamp01(next)
}

/** Decides how a single day's delivery/signal outcome affects the skip streak. */
export function computeSkipStreakDelta(args: {
  deliveryStatus: 'sent' | 'skipped' | 'failed' | 'scheduled'
  signal: EngagementSignal
  currentSkipStreak: number
  flagThreshold?: number
}): SkipStreakDecision {
  const { deliveryStatus, signal, currentSkipStreak, flagThreshold = DEFAULT_FLAG_THRESHOLD } = args

  if (deliveryStatus !== 'sent') {
    return { skipStreakDelta: 0, resetSkipStreak: false, shouldFlag: false, shouldUnflag: false }
  }

  if (signal.completed) {
    return { skipStreakDelta: 0, resetSkipStreak: true, shouldFlag: false, shouldUnflag: true }
  }

  return {
    skipStreakDelta: 1,
    resetSkipStreak: false,
    shouldFlag: currentSkipStreak + 1 >= flagThreshold,
    shouldUnflag: false,
  }
}
