/**
 * Shared types for the learning core.
 *
 * Everything under lib/learning/** is pure: `now` is always a parameter, never
 * read from the clock; no module here may import a DB client, an SDK, or
 * anything from node: other than `crypto`. That's the boundary that makes this
 * layer testable without I/O — keep it.
 */

// --- Spaced repetition (SM-2) ---

export type SchedulingState = {
  easeFactor: number
  intervalDays: number
  repetitions: number
  dueAt: Date | null
  introducedAt: Date | null
  lastSeenAt: Date | null
}

/** SM-2 recall quality. 0 = no answer, 5 = perfect and fast. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5

export type ResponseOutcome = {
  /** null when the item was never answered (abandoned or ignored). */
  correct: boolean | null
  /** Adventures grade partially, in [0,1]. Quizzes are 0 or 1. */
  score: number | null
  responseTimeMs: number | null
  abandoned: boolean
}

// --- Selection ---

export type ConceptCandidate = {
  conceptId: string
  /** null = never introduced. Such a concept is a coverage candidate, not a due one. */
  dueAt: Date | null
  introducedAt: Date | null
  /** EWMA in [0,1]. */
  engagementScore: number
  /** Non-null once skipStreak hits the flag threshold. */
  flaggedAt: Date | null
}

export type ContentCandidate = {
  itemId: string
  kind: 'quiz' | 'adventure'
  /** One for a quiz, several for an adventure. */
  conceptIds: string[]
}

export type RecentDelivery = {
  deliveredAt: Date
  itemId: string
  conceptIds: string[]
}

export type SelectionWeights = {
  due: number
  engagement: number
  coverage: number
  noveltyPenalty: number
}

export type SelectionInput = {
  /** The only clock input. Never call new Date() below this line. */
  now: Date
  concepts: ConceptCandidate[]
  content: ContentCandidate[]
  recentDeliveries: RecentDelivery[]
  weights?: Partial<SelectionWeights>
}

export type ScoredCandidate = {
  itemId: string
  score: number
  /** Why it scored what it scored. Observability only. */
  breakdown: {
    conceptId: string
    due: number
    engagement: number
    coverage: number
    total: number
  }[]
  noveltyPenalized: boolean
}

export type SelectionResult =
  | {
      chosenItemId: string
      chosenConceptIds: string[]
      score: number
      /** Set when nothing scored above zero and we fell back to soonest-due. */
      fallback: boolean
      scoredCandidates: ScoredCandidate[]
    }
  | { chosenItemId: null; reason: 'empty_bank' }

// --- Engagement ---

export type EngagementSignal = {
  emailOpened: boolean
  linkClicked: boolean
  completed: boolean
}

export type SkipStreakDecision = {
  skipStreakDelta: number
  /** Absolute reset wins over delta when true. */
  resetSkipStreak: boolean
  shouldFlag: boolean
  shouldUnflag: boolean
}

// --- Signed links ---

export type TokenPayload = {
  deliveryId: string
  /** Unix seconds. */
  exp: number
}

export type TokenVerification =
  | { valid: true; payload: TokenPayload }
  | { valid: false; reason: 'malformed' | 'bad_signature' | 'expired' }
