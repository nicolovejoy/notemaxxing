/**
 * The answer side of the daily loop: the emailed link lands here.
 *
 * Two entry points, both taking `db` and an explicit `now` so the whole thing
 * is testable against PGlite with nothing on the wire:
 *
 *   loadDelivery   — GET  /learn/r/[token]      (render the question)
 *   recordResponse — POST /api/learn/respond    (grade it, advance the scheduler)
 *
 * The token IS the auth. There is no session; whoever holds a valid token acts
 * as the delivery it names. Every path fails closed.
 */
import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '../db'
import {
  conceptState,
  contentItemConcepts,
  contentItems,
  deliveries,
  engagementEvents,
  learners,
  responseConceptOutcomes,
  responses,
} from '../db/schema'
import { computeSkipStreakDelta, updateEngagement } from '../learning/engagement'
import { scoreToQuality, smUpdate } from '../learning/scheduling'
import { verifyToken } from '../learning/token'
import type { SchedulingState } from '../learning/types'

/** Mirrors concept_state's column defaults — a concept with no row starts here. */
const DEFAULT_EASE_FACTOR = 2.5
const DEFAULT_ENGAGEMENT = 0.5

export type LoadFailure = {
  ok: false
  reason: 'malformed' | 'bad_signature' | 'expired' | 'not_found'
}

/** What the learner already answered. Present iff they've responded. */
export type Reveal = {
  chosenIndex: number
  correctIndex: number
  correct: boolean
  explanation: string
}

export type LoadedQuiz = {
  ok: true
  kind: 'quiz'
  deliveryId: string
  learnerName: string
  title: string
  prompt: string
  /** Deliberately excludes correct_index and explanation — see stripAnswerKey. */
  options: string[]
  reveal: Reveal | null
}

export type LoadedAdventure = {
  ok: true
  kind: 'adventure'
  deliveryId: string
  learnerName: string
  title: string
  openingScenario: string
}

export type LoadResult = LoadedQuiz | LoadedAdventure | LoadFailure

export type RespondResult =
  | { ok: true; reveal: Reveal; alreadyAnswered: boolean }
  | { ok: false; reason: LoadFailure['reason'] | 'unsupported_kind' | 'bad_choice' }

type QuizBody = {
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/**
 * The authored bank is hand-written JSON, so treat every field as missing until
 * proven otherwise. A malformed item must degrade to an unanswerable question,
 * never throw a 500 into someone's morning.
 */
function parseQuizBody(body: unknown): QuizBody | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  const options = Array.isArray(b.options) ? b.options.filter((o): o is string => typeof o === 'string') : []
  const correctIndex = typeof b.correct_index === 'number' ? b.correct_index : -1
  if (options.length < 2) return null
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) return null
  return { prompt: str(b.prompt), options, correctIndex, explanation: str(b.explanation) }
}

type Resolved = {
  delivery: typeof deliveries.$inferSelect
  item: typeof contentItems.$inferSelect
  learner: typeof learners.$inferSelect
}

/** Token -> delivery + item + learner, or a failure reason. Shared by both entry points. */
async function resolveToken(
  db: Db,
  token: string,
  secret: string,
  now: Date
): Promise<{ ok: true; value: Resolved } | LoadFailure> {
  const verified = verifyToken(token, secret, now)
  if (!verified.valid) return { ok: false, reason: verified.reason }

  const [row] = await db
    .select({ delivery: deliveries, item: contentItems, learner: learners })
    .from(deliveries)
    .innerJoin(contentItems, eq(contentItems.id, deliveries.contentItemId))
    .innerJoin(learners, eq(learners.id, deliveries.learnerId))
    .where(eq(deliveries.id, verified.payload.deliveryId))
    .limit(1)

  if (!row) return { ok: false, reason: 'not_found' }
  return { ok: true, value: row }
}

async function existingReveal(db: Db, deliveryId: string, item: typeof contentItems.$inferSelect): Promise<Reveal | null> {
  const [row] = await db.select().from(responses).where(eq(responses.deliveryId, deliveryId)).limit(1)
  if (!row) return null

  const quiz = parseQuizBody(item.body)
  const payload = row.answerPayload as Record<string, unknown>
  const chosenIndex = typeof payload.chosenIndex === 'number' ? payload.chosenIndex : -1

  return {
    chosenIndex,
    correctIndex: quiz?.correctIndex ?? -1,
    correct: row.isCorrect ?? false,
    explanation: quiz?.explanation ?? '',
  }
}

/**
 * Render payload for the answer page.
 *
 * Writes a `link_clicked` engagement event as a side effect — this is also what
 * recordResponse reads to derive response time, so the read path has to run
 * first. It does: you can't POST an answer without loading the page.
 */
export async function loadDelivery(
  db: Db,
  args: { token: string; secret: string; now: Date }
): Promise<LoadResult> {
  const resolved = await resolveToken(db, args.token, args.secret, args.now)
  if (!resolved.ok) return resolved
  const { delivery, item, learner } = resolved.value

  await recordClick(db, delivery.id, args.now)

  if (item.kind === 'adventure') {
    const body = (item.body ?? {}) as Record<string, unknown>
    return {
      ok: true,
      kind: 'adventure',
      deliveryId: delivery.id,
      learnerName: learner.name,
      title: item.title,
      openingScenario: str(body.opening_scenario),
    }
  }

  const quiz = parseQuizBody(item.body)
  return {
    ok: true,
    kind: 'quiz',
    deliveryId: delivery.id,
    learnerName: learner.name,
    title: item.title,
    prompt: quiz?.prompt ?? '',
    // The answer key never leaves the server until they've answered.
    options: quiz?.options ?? [],
    reveal: await existingReveal(db, delivery.id, item),
  }
}

/** At-most-one click event per delivery — a refresh isn't a second click. */
async function recordClick(db: Db, deliveryId: string, now: Date): Promise<void> {
  const [existing] = await db
    .select({ id: engagementEvents.id })
    .from(engagementEvents)
    .where(and(eq(engagementEvents.deliveryId, deliveryId), eq(engagementEvents.eventType, 'link_clicked')))
    .limit(1)
  if (existing) return
  await db.insert(engagementEvents).values({ deliveryId, eventType: 'link_clicked', occurredAt: now })
}

/**
 * Server-derived response time: now minus the first link_clicked.
 *
 * The client could tell us, but the client can also lie, and this feeds
 * scoreToQuality's fast/slow bucket. The event is written on page load anyway,
 * so honesty is free here. null when there's no click event (direct POST).
 */
async function responseTimeMs(db: Db, deliveryId: string, now: Date): Promise<number | null> {
  const [click] = await db
    .select({ occurredAt: engagementEvents.occurredAt })
    .from(engagementEvents)
    .where(and(eq(engagementEvents.deliveryId, deliveryId), eq(engagementEvents.eventType, 'link_clicked')))
    .orderBy(asc(engagementEvents.occurredAt))
    .limit(1)
  if (!click) return null
  return Math.max(0, now.getTime() - click.occurredAt.getTime())
}

/**
 * Grade the answer, persist it, and advance every tagged concept's state.
 *
 * responses.delivery_id is UNIQUE, and that constraint is load-bearing: a
 * re-clicked link inserts zero rows and we return the existing reveal WITHOUT
 * re-applying SM-2. Double-advancing the scheduler on a double-click is exactly
 * what that index exists to prevent.
 */
export async function recordResponse(
  db: Db,
  args: { token: string; secret: string; now: Date; chosenIndex: number }
): Promise<RespondResult> {
  const resolved = await resolveToken(db, args.token, args.secret, args.now)
  if (!resolved.ok) return resolved
  const { delivery, item } = resolved.value

  // Live chat grading is its own milestone; nothing in the bank is an
  // adventure yet, so this is unreachable today and deliberately explicit.
  if (item.kind !== 'quiz') return { ok: false, reason: 'unsupported_kind' }

  const quiz = parseQuizBody(item.body)
  if (!quiz) return { ok: false, reason: 'unsupported_kind' }
  if (!Number.isInteger(args.chosenIndex) || args.chosenIndex < 0 || args.chosenIndex >= quiz.options.length) {
    return { ok: false, reason: 'bad_choice' }
  }

  const correct = args.chosenIndex === quiz.correctIndex
  const elapsed = await responseTimeMs(db, delivery.id, args.now)

  const inserted = await db
    .insert(responses)
    .values({
      deliveryId: delivery.id,
      answerPayload: { chosenIndex: args.chosenIndex },
      isCorrect: correct,
      overallScore: correct ? 1 : 0,
      responseTimeMs: elapsed,
      abandoned: false,
      submittedAt: args.now,
    })
    .onConflictDoNothing()
    .returning()

  const reveal: Reveal = {
    chosenIndex: args.chosenIndex,
    correctIndex: quiz.correctIndex,
    correct,
    explanation: quiz.explanation,
  }

  if (inserted.length === 0) {
    // Already answered. Show them what they did, change nothing.
    const prior = await existingReveal(db, delivery.id, item)
    return { ok: true, reveal: prior ?? reveal, alreadyAnswered: true }
  }
  const response = inserted[0]

  const tagged = await db
    .select({ conceptId: contentItemConcepts.conceptId })
    .from(contentItemConcepts)
    .where(eq(contentItemConcepts.itemId, item.id))

  const conceptIds = tagged.map((t) => t.conceptId)

  if (conceptIds.length > 0) {
    await db.insert(responseConceptOutcomes).values(
      conceptIds.map((conceptId) => ({
        responseId: response.id,
        conceptId,
        correct,
        score: correct ? 1 : 0,
      }))
    )
  }

  for (const conceptId of conceptIds) {
    await advanceConcept(db, {
      learnerId: delivery.learnerId,
      conceptId,
      correct,
      elapsed,
      now: args.now,
    })
  }

  await db.insert(engagementEvents).values({
    deliveryId: delivery.id,
    eventType: 'session_completed',
    occurredAt: args.now,
  })

  return { ok: true, reveal, alreadyAnswered: false }
}

/**
 * One concept's state after one answer: SM-2 + engagement + skip streak.
 *
 * Upsert, not update: a cold-start concept has no concept_state row at all
 * (that's why the selector LEFT JOINs), and the first answer is often the row's
 * first existence.
 */
async function advanceConcept(
  db: Db,
  args: { learnerId: string; conceptId: string; correct: boolean; elapsed: number | null; now: Date }
): Promise<void> {
  const { learnerId, conceptId, correct, elapsed, now } = args

  const [current] = await db
    .select()
    .from(conceptState)
    .where(and(eq(conceptState.learnerId, learnerId), eq(conceptState.conceptId, conceptId)))
    .limit(1)

  const prior: SchedulingState = {
    easeFactor: current?.easeFactor ?? DEFAULT_EASE_FACTOR,
    intervalDays: current?.intervalDays ?? 0,
    repetitions: current?.repetitions ?? 0,
    dueAt: current?.dueAt ?? null,
    introducedAt: current?.introducedAt ?? null,
    lastSeenAt: current?.lastSeenAt ?? null,
  }

  const quality = scoreToQuality({
    correct,
    score: correct ? 1 : 0,
    responseTimeMs: elapsed,
    abandoned: false,
  })
  const next = smUpdate(prior, quality, now)

  // An answered question is a completed one, whatever the score — engagement
  // measures whether he showed up, not whether he was right.
  const signal = { emailOpened: false, linkClicked: true, completed: true }
  const engagementScore = updateEngagement(current?.engagementScore ?? DEFAULT_ENGAGEMENT, signal)

  const decision = computeSkipStreakDelta({
    deliveryStatus: 'sent',
    signal,
    currentSkipStreak: current?.skipStreak ?? 0,
  })

  const skipStreak = decision.resetSkipStreak ? 0 : (current?.skipStreak ?? 0) + decision.skipStreakDelta

  const values = {
    learnerId,
    conceptId,
    easeFactor: next.easeFactor,
    intervalDays: next.intervalDays,
    repetitions: next.repetitions,
    dueAt: next.dueAt,
    introducedAt: next.introducedAt,
    lastSeenAt: next.lastSeenAt,
    engagementScore,
    skipStreak,
    flaggedAt: decision.shouldUnflag ? null : (current?.flaggedAt ?? null),
    flaggedReason: decision.shouldUnflag ? null : (current?.flaggedReason ?? null),
    updatedAt: now,
  }

  await db
    .insert(conceptState)
    .values(values)
    .onConflictDoUpdate({
      target: [conceptState.learnerId, conceptState.conceptId],
      set: values,
    })
}
