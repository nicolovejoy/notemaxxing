/**
 * Picks tomorrow's item.
 *
 * This is the product. Everything else — email, chat, dashboard — is delivery
 * mechanism for whatever this function decides. It is pure: `now` comes in as a
 * parameter, ties break on itemId, and there is no Math.random() anywhere. Same
 * input, same output, forever.
 *
 * Three signals combine additively per concept:
 *
 *   conceptScore = w.due·dueScore + w.engagement·engagementScore + w.coverage·coverageScore
 *
 * and an item scores at the MAX of its tagged concepts, minus a novelty penalty:
 *
 *   itemScore = max(conceptScore for tagged) − w.noveltyPenalty·recentlySeen
 */
import type {
  ConceptCandidate,
  ContentCandidate,
  ScoredCandidate,
  SelectionInput,
  SelectionResult,
  SelectionWeights,
} from './types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * How far ahead a due date stops mattering. A concept due beyond this scores 0;
 * one this far overdue scores 1; due-today sits at 0.5.
 */
const DUE_HORIZON_DAYS = 14

/** Deliveries this recent make an item stale. */
const NOVELTY_WINDOW_DAYS = 3

/**
 * The floor a flagged concept's engagement is raised to.
 *
 * This is what "flagged, not dropped" actually means. A concept Max keeps
 * skipping decays toward 0 engagement and would quietly sink out of rotation
 * forever. The floor re-injects it as a competitive candidate — but it's a
 * floor inside the same additive sum, not a bonus on top and not a filter, so
 * a genuinely urgent concept can still outrank it. It nags exactly as hard as
 * a neutral concept does, and no harder.
 */
const FLAGGED_ENGAGEMENT_FLOOR = 0.6

/**
 * Due-dominant on purpose. "Show him more of what he engages with" fights
 * spaced repetition whenever he loves something he already knows — so due
 * pressure outweighs engagement. Tune once there's real data.
 */
export const DEFAULT_WEIGHTS: SelectionWeights = {
  due: 0.5,
  engagement: 0.3,
  coverage: 0.4,
  // Must stay well under `due`, or it stops being a penalty and becomes an
  // exclusion: a penalty larger than the entire due range means no amount of
  // urgency can ever win through it, and a badly overdue concept would be
  // silently benched for the whole novelty window.
  noveltyPenalty: 0.25,
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/**
 * Urgency in [0,1], linear (not sigmoidal) so the test table is exact
 * arithmetic rather than transcendental approximation.
 *
 * Never-introduced concepts score 0 here — they aren't "due", they're coverage
 * candidates, and scoring them as maximally-due would drown out real reviews.
 */
export function dueScore(concept: ConceptCandidate, now: Date): number {
  if (concept.introducedAt === null || concept.dueAt === null) return 0
  const daysUntilDue = (concept.dueAt.getTime() - now.getTime()) / DAY_MS
  return clamp01(0.5 - daysUntilDue / (2 * DUE_HORIZON_DAYS))
}

/** 1 if never introduced, else 0. This is what works new material in. */
export function coverageScore(concept: ConceptCandidate): number {
  return concept.introducedAt === null ? 1 : 0
}

/** The stored EWMA, raised to the floor if the concept is flagged. */
export function effectiveEngagement(concept: ConceptCandidate): number {
  return concept.flaggedAt !== null
    ? Math.max(concept.engagementScore, FLAGGED_ENGAGEMENT_FLOOR)
    : concept.engagementScore
}

function wasRecentlySeen(
  item: ContentCandidate,
  recentDeliveries: SelectionInput['recentDeliveries'],
  now: Date
): boolean {
  const cutoff = now.getTime() - NOVELTY_WINDOW_DAYS * DAY_MS
  return recentDeliveries.some((d) => {
    if (d.deliveredAt.getTime() < cutoff) return false
    if (d.itemId === item.itemId) return true
    // Same concept from a different item is still repetition.
    return d.conceptIds.some((c) => item.conceptIds.includes(c))
  })
}

export function selectNextItem(input: SelectionInput): SelectionResult {
  const { now, concepts, content, recentDeliveries } = input
  const w = { ...DEFAULT_WEIGHTS, ...input.weights }

  const byId = new Map(concepts.map((c) => [c.conceptId, c]))

  // An item is only a candidate if we know at least one concept it tags.
  const candidates = content.filter((item) => item.conceptIds.some((id) => byId.has(id)))
  if (candidates.length === 0) {
    return { chosenItemId: null, reason: 'empty_bank' }
  }

  const scored: ScoredCandidate[] = candidates.map((item) => {
    const breakdown = item.conceptIds
      .map((id) => byId.get(id))
      .filter((c): c is ConceptCandidate => c !== undefined)
      .map((c) => {
        const due = dueScore(c, now)
        const engagement = effectiveEngagement(c)
        const coverage = coverageScore(c)
        return {
          conceptId: c.conceptId,
          due,
          engagement,
          coverage,
          total: w.due * due + w.engagement * engagement + w.coverage * coverage,
        }
      })

    // MAX, not average: an adventure tagging one overdue concept and one
    // long-mastered one should surface on the overdue one's urgency rather
    // than be diluted toward the mastered one's near-zero score.
    const best = Math.max(...breakdown.map((b) => b.total))
    const noveltyPenalized = wasRecentlySeen(item, recentDeliveries, now)

    return {
      itemId: item.itemId,
      score: best - (noveltyPenalized ? w.noveltyPenalty : 0),
      breakdown,
      noveltyPenalized,
    }
  })

  // Ties break on itemId so the result is stable regardless of input order.
  const ranked = [...scored].sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.itemId.localeCompare(b.itemId)
  )

  const top = ranked[0]

  // Nothing scored: everything is introduced, far from due, and unengaging.
  // The daily email still goes out — fall back to whatever comes due soonest
  // rather than sending nothing.
  if (top.score <= 0) {
    const fallback = pickSoonestDue(candidates, byId)
    const fallbackScored = scored.find((s) => s.itemId === fallback.itemId)!
    return {
      chosenItemId: fallback.itemId,
      chosenConceptIds: fallback.conceptIds,
      score: fallbackScored.score,
      fallback: true,
      scoredCandidates: ranked,
    }
  }

  const chosenItem = candidates.find((c) => c.itemId === top.itemId)!
  return {
    chosenItemId: top.itemId,
    chosenConceptIds: chosenItem.conceptIds,
    score: top.score,
    fallback: false,
    scoredCandidates: ranked,
  }
}

/** Whichever item touches the concept coming due soonest. Ties on itemId. */
function pickSoonestDue(
  candidates: ContentCandidate[],
  byId: Map<string, ConceptCandidate>
): ContentCandidate {
  const soonest = (item: ContentCandidate): number => {
    const times = item.conceptIds
      .map((id) => byId.get(id)?.dueAt)
      .filter((d): d is Date => d instanceof Date)
      .map((d) => d.getTime())
    return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY
  }

  return [...candidates].sort((a, b) => {
    const diff = soonest(a) - soonest(b)
    return diff !== 0 ? diff : a.itemId.localeCompare(b.itemId)
  })[0]
}
