import { and, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Db } from '../db'
import { loadDelivery, recordResponse } from './respond'
import { signToken } from '../learning/token'
import {
  NOW,
  conceptState,
  contentItems,
  daysFromNow,
  engagementEvents,
  responseConceptOutcomes,
  responses,
  seedConcept,
  seedConceptState,
  seedDelivery,
  seedItem,
  seedLearner,
  setupDb,
} from '../testkit'

const SECRET = 'test-secret'

function tokenFor(deliveryId: string, expiresAt: Date = daysFromNow(7)): string {
  return signToken({ deliveryId, exp: Math.floor(expiresAt.getTime() / 1000) }, SECRET)
}

const QUIZ_BODY = {
  prompt: 'Which ion influx drives the rising phase of an action potential?',
  options: ['Sodium', 'Potassium', 'Chloride', 'Calcium'],
  correct_index: 0,
  explanation: 'Voltage-gated Na+ channels open first.',
}

let db: Db
let close: () => Promise<void>
let learner: Awaited<ReturnType<typeof seedLearner>>

beforeEach(async () => {
  ;({ db, close } = await setupDb())
  learner = await seedLearner(db, { name: 'Nico' })
})

afterEach(async () => {
  await close()
})

/** A learner + concept + quiz item + delivery, wired together. The common case. */
async function seedLoop(over: { body?: Record<string, unknown> } = {}) {
  const concept = await seedConcept(db, 'action-potential')
  const item = await seedItem(db, [concept.id], { body: over.body ?? QUIZ_BODY })
  const delivery = await seedDelivery(db, learner.id, item.id, { status: 'sent', sentAt: NOW })
  return { concept, item, delivery, token: tokenFor(delivery.id) }
}

describe('loadDelivery', () => {
  it('returns the question and options for a valid token', async () => {
    const { token } = await seedLoop()

    const result = await loadDelivery(db, { token, secret: SECRET, now: NOW })

    expect(result.ok).toBe(true)
    if (!result.ok || result.kind !== 'quiz') throw new Error('expected a quiz')
    expect(result.prompt).toBe(QUIZ_BODY.prompt)
    expect(result.options).toEqual(QUIZ_BODY.options)
    expect(result.learnerName).toBe('Nico')
    expect(result.reveal).toBeNull()
  })

  it('never returns the answer key before an answer is given', async () => {
    const { token } = await seedLoop()

    const result = await loadDelivery(db, { token, secret: SECRET, now: NOW })

    // The whole payload is serialized into the page. If correct_index or the
    // explanation appear anywhere in it, the answer shipped to the browser.
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('correct_index')
    expect(serialized).not.toContain(QUIZ_BODY.explanation)
  })

  it('rejects a token signed with the wrong secret', async () => {
    const { delivery } = await seedLoop()
    const forged = signToken({ deliveryId: delivery.id, exp: 9999999999 }, 'not-the-secret')

    const result = await loadDelivery(db, { token: forged, secret: SECRET, now: NOW })

    expect(result).toEqual({ ok: false, reason: 'bad_signature' })
  })

  it('rejects an expired token', async () => {
    const { delivery } = await seedLoop()
    const token = tokenFor(delivery.id, daysFromNow(-1))

    const result = await loadDelivery(db, { token, secret: SECRET, now: NOW })

    expect(result).toEqual({ ok: false, reason: 'expired' })
  })

  it('rejects a malformed token', async () => {
    const result = await loadDelivery(db, { token: 'garbage', secret: SECRET, now: NOW })
    expect(result).toEqual({ ok: false, reason: 'malformed' })
  })

  it('reports not_found when the token names a delivery that no longer exists', async () => {
    const token = tokenFor('00000000-0000-0000-0000-000000000000')

    const result = await loadDelivery(db, { token, secret: SECRET, now: NOW })

    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('records a link_clicked event', async () => {
    const { token, delivery } = await seedLoop()

    await loadDelivery(db, { token, secret: SECRET, now: NOW })

    const events = await db
      .select()
      .from(engagementEvents)
      .where(eq(engagementEvents.deliveryId, delivery.id))
    expect(events.map((e) => e.eventType)).toEqual(['link_clicked'])
  })

  it('does not record a second click when the page is refreshed', async () => {
    const { token, delivery } = await seedLoop()

    await loadDelivery(db, { token, secret: SECRET, now: NOW })
    await loadDelivery(db, { token, secret: SECRET, now: new Date(NOW.getTime() + 5000) })

    const events = await db
      .select()
      .from(engagementEvents)
      .where(eq(engagementEvents.deliveryId, delivery.id))
    expect(events).toHaveLength(1)
  })

  it('surfaces the prior answer when the link is revisited after answering', async () => {
    const { token } = await seedLoop()
    await loadDelivery(db, { token, secret: SECRET, now: NOW })
    await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 1 })

    const result = await loadDelivery(db, { token, secret: SECRET, now: NOW })

    if (!result.ok || result.kind !== 'quiz') throw new Error('expected a quiz')
    expect(result.reveal).toEqual({
      chosenIndex: 1,
      correctIndex: 0,
      correct: false,
      explanation: QUIZ_BODY.explanation,
    })
  })

  it('renders an adventure without pretending it is a quiz', async () => {
    const concept = await seedConcept(db, 'synaptic-plasticity')
    const item = await seedItem(db, [concept.id], {
      kind: 'adventure',
      title: 'A patient presents',
      body: { opening_scenario: 'A 34-year-old reports...', grading_rubric: 'x', max_turns: 8 },
    })
    const delivery = await seedDelivery(db, learner.id, item.id, { status: 'sent', sentAt: NOW })

    const result = await loadDelivery(db, { token: tokenFor(delivery.id), secret: SECRET, now: NOW })

    if (!result.ok) throw new Error('expected success')
    expect(result.kind).toBe('adventure')
  })
})

describe('recordResponse — grading', () => {
  it('marks a correct answer correct and reveals the explanation', async () => {
    const { token } = await seedLoop()

    const result = await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 0 })

    expect(result).toEqual({
      ok: true,
      alreadyAnswered: false,
      reveal: {
        chosenIndex: 0,
        correctIndex: 0,
        correct: true,
        explanation: QUIZ_BODY.explanation,
      },
    })
  })

  it('marks a wrong answer wrong', async () => {
    const { token } = await seedLoop()

    const result = await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 2 })

    if (!result.ok) throw new Error('expected success')
    expect(result.reveal.correct).toBe(false)
    expect(result.reveal.correctIndex).toBe(0)
  })

  it('persists the response row', async () => {
    const { token, delivery } = await seedLoop()

    await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 0 })

    const [row] = await db.select().from(responses).where(eq(responses.deliveryId, delivery.id))
    expect(row.isCorrect).toBe(true)
    expect(row.overallScore).toBe(1)
    expect(row.abandoned).toBe(false)
  })

  it('writes a per-concept outcome for every tagged concept', async () => {
    const a = await seedConcept(db, 'concept-a')
    const b = await seedConcept(db, 'concept-b')
    const item = await seedItem(db, [a.id, b.id], { body: QUIZ_BODY })
    const delivery = await seedDelivery(db, learner.id, item.id, { status: 'sent', sentAt: NOW })

    await recordResponse(db, { token: tokenFor(delivery.id), secret: SECRET, now: NOW, chosenIndex: 0 })

    const outcomes = await db.select().from(responseConceptOutcomes)
    expect(outcomes).toHaveLength(2)
    expect(outcomes.every((o) => o.correct && o.score === 1)).toBe(true)
  })

  it('rejects an out-of-range choice', async () => {
    const { token } = await seedLoop()

    expect(await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 99 })).toEqual({
      ok: false,
      reason: 'bad_choice',
    })
    expect(await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: -1 })).toEqual({
      ok: false,
      reason: 'bad_choice',
    })
  })

  it('rejects a forged token before touching the database', async () => {
    const { delivery } = await seedLoop()
    const forged = signToken({ deliveryId: delivery.id, exp: 9999999999 }, 'not-the-secret')

    const result = await recordResponse(db, { token: forged, secret: SECRET, now: NOW, chosenIndex: 0 })

    expect(result).toEqual({ ok: false, reason: 'bad_signature' })
    expect(await db.select().from(responses)).toHaveLength(0)
  })

  it('refuses to grade an adventure', async () => {
    const concept = await seedConcept(db, 'synaptic-plasticity')
    const item = await seedItem(db, [concept.id], {
      kind: 'adventure',
      body: { opening_scenario: 'x', grading_rubric: 'y', max_turns: 8 },
    })
    const delivery = await seedDelivery(db, learner.id, item.id, { status: 'sent', sentAt: NOW })

    const result = await recordResponse(db, {
      token: tokenFor(delivery.id),
      secret: SECRET,
      now: NOW,
      chosenIndex: 0,
    })

    expect(result).toEqual({ ok: false, reason: 'unsupported_kind' })
  })

  it('degrades to unsupported rather than throwing on a malformed item body', async () => {
    const { token } = await seedLoop({ body: { prompt: 'no options were authored' } })

    const result = await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 0 })

    expect(result).toEqual({ ok: false, reason: 'unsupported_kind' })
  })
})

describe('recordResponse — idempotency', () => {
  it('does not double-score a re-clicked link', async () => {
    const { token, delivery } = await seedLoop()

    const first = await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 0 })
    const second = await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 2 })

    if (!first.ok || !second.ok) throw new Error('expected success')
    expect(first.alreadyAnswered).toBe(false)
    expect(second.alreadyAnswered).toBe(true)
    // The second answer is discarded entirely — the first one stands.
    expect(second.reveal.chosenIndex).toBe(0)
    expect(await db.select().from(responses).where(eq(responses.deliveryId, delivery.id))).toHaveLength(1)
  })

  it('does not advance the scheduler twice on a double submit', async () => {
    const { token, concept } = await seedLoop()

    await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 0 })
    const [afterFirst] = await db
      .select()
      .from(conceptState)
      .where(eq(conceptState.conceptId, concept.id))

    await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 0 })
    const [afterSecond] = await db
      .select()
      .from(conceptState)
      .where(eq(conceptState.conceptId, concept.id))

    expect(afterSecond.repetitions).toBe(afterFirst.repetitions)
    expect(afterSecond.intervalDays).toBe(afterFirst.intervalDays)
    expect(afterSecond.easeFactor).toBe(afterFirst.easeFactor)
    expect(afterSecond.dueAt).toEqual(afterFirst.dueAt)
  })

  it('writes exactly one set of concept outcomes across repeated submits', async () => {
    const { token } = await seedLoop()

    await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 0 })
    await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 0 })

    expect(await db.select().from(responseConceptOutcomes)).toHaveLength(1)
  })
})

describe('recordResponse — concept state', () => {
  it('creates a concept_state row for a cold-start concept that has none', async () => {
    const { token, concept } = await seedLoop()
    expect(await db.select().from(conceptState)).toHaveLength(0)

    await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 0 })

    const [state] = await db
      .select()
      .from(conceptState)
      .where(and(eq(conceptState.learnerId, learner.id), eq(conceptState.conceptId, concept.id)))
    expect(state).toBeDefined()
    expect(state.repetitions).toBe(1)
    expect(state.introducedAt).toEqual(NOW)
    expect(state.lastSeenAt).toEqual(NOW)
    // First correct answer schedules the classic SM-2 one-day interval.
    expect(state.intervalDays).toBe(1)
    expect(state.dueAt).toEqual(daysFromNow(1))
  })

  it('advances an existing concept_state row rather than resetting it', async () => {
    const concept = await seedConcept(db, 'action-potential')
    await seedConceptState(db, learner.id, concept.id, {
      repetitions: 2,
      intervalDays: 6,
      easeFactor: 2.5,
      introducedAt: daysFromNow(-30),
    })
    const item = await seedItem(db, [concept.id], { body: QUIZ_BODY })
    const delivery = await seedDelivery(db, learner.id, item.id, { status: 'sent', sentAt: NOW })

    await recordResponse(db, { token: tokenFor(delivery.id), secret: SECRET, now: NOW, chosenIndex: 0 })

    const [state] = await db.select().from(conceptState).where(eq(conceptState.conceptId, concept.id))
    expect(state.repetitions).toBe(3)
    expect(state.intervalDays).toBe(15) // round(6 * 2.5)
    expect(state.introducedAt).toEqual(daysFromNow(-30)) // preserved, not overwritten
  })

  it('resets repetitions on a wrong answer', async () => {
    const concept = await seedConcept(db, 'action-potential')
    await seedConceptState(db, learner.id, concept.id, {
      repetitions: 4,
      intervalDays: 30,
      introducedAt: daysFromNow(-60),
    })
    const item = await seedItem(db, [concept.id], { body: QUIZ_BODY })
    const delivery = await seedDelivery(db, learner.id, item.id, { status: 'sent', sentAt: NOW })

    await recordResponse(db, { token: tokenFor(delivery.id), secret: SECRET, now: NOW, chosenIndex: 3 })

    const [state] = await db.select().from(conceptState).where(eq(conceptState.conceptId, concept.id))
    expect(state.repetitions).toBe(0)
    expect(state.intervalDays).toBe(1)
    expect(state.dueAt).toEqual(daysFromNow(1))
  })

  it('raises engagement on an answer, right or wrong', async () => {
    const concept = await seedConcept(db, 'action-potential')
    await seedConceptState(db, learner.id, concept.id, { engagementScore: 0.5 })
    const item = await seedItem(db, [concept.id], { body: QUIZ_BODY })
    const delivery = await seedDelivery(db, learner.id, item.id, { status: 'sent', sentAt: NOW })

    // Answering wrong is still showing up.
    await recordResponse(db, { token: tokenFor(delivery.id), secret: SECRET, now: NOW, chosenIndex: 2 })

    const [state] = await db.select().from(conceptState).where(eq(conceptState.conceptId, concept.id))
    expect(state.engagementScore).toBeCloseTo(0.65, 5) // 0.3 * 1.0 + 0.7 * 0.5
  })

  it('clears a flag and resets the skip streak when a flagged concept is answered', async () => {
    const concept = await seedConcept(db, 'action-potential')
    await seedConceptState(db, learner.id, concept.id, {
      skipStreak: 3,
      flaggedAt: daysFromNow(-1),
      flaggedReason: 'skipped 3x',
    })
    const item = await seedItem(db, [concept.id], { body: QUIZ_BODY })
    const delivery = await seedDelivery(db, learner.id, item.id, { status: 'sent', sentAt: NOW })

    await recordResponse(db, { token: tokenFor(delivery.id), secret: SECRET, now: NOW, chosenIndex: 0 })

    const [state] = await db.select().from(conceptState).where(eq(conceptState.conceptId, concept.id))
    expect(state.skipStreak).toBe(0)
    expect(state.flaggedAt).toBeNull()
    expect(state.flaggedReason).toBeNull()
  })

  it('advances every concept an item is tagged to', async () => {
    const a = await seedConcept(db, 'concept-a')
    const b = await seedConcept(db, 'concept-b')
    const item = await seedItem(db, [a.id, b.id], { body: QUIZ_BODY })
    const delivery = await seedDelivery(db, learner.id, item.id, { status: 'sent', sentAt: NOW })

    await recordResponse(db, { token: tokenFor(delivery.id), secret: SECRET, now: NOW, chosenIndex: 0 })

    const states = await db.select().from(conceptState)
    expect(states).toHaveLength(2)
    expect(states.every((s) => s.repetitions === 1)).toBe(true)
  })

  it('leaves the other learner untouched', async () => {
    const max = await seedLearner(db, { email: 'max@other.example', name: 'Max' })
    const concept = await seedConcept(db, 'action-potential')
    await seedConceptState(db, max.id, concept.id, { repetitions: 2, intervalDays: 6 })
    const item = await seedItem(db, [concept.id], { body: QUIZ_BODY })
    const delivery = await seedDelivery(db, learner.id, item.id, { status: 'sent', sentAt: NOW })

    await recordResponse(db, { token: tokenFor(delivery.id), secret: SECRET, now: NOW, chosenIndex: 0 })

    const [maxState] = await db
      .select()
      .from(conceptState)
      .where(eq(conceptState.learnerId, max.id))
    expect(maxState.repetitions).toBe(2)
    expect(maxState.intervalDays).toBe(6)
  })
})

describe('recordResponse — response time', () => {
  it('derives response time from the click event, not the client', async () => {
    const { token, delivery } = await seedLoop()
    await loadDelivery(db, { token, secret: SECRET, now: NOW })

    const later = new Date(NOW.getTime() + 12_000)
    await recordResponse(db, { token, secret: SECRET, now: later, chosenIndex: 0 })

    const [row] = await db.select().from(responses).where(eq(responses.deliveryId, delivery.id))
    expect(row.responseTimeMs).toBe(12_000)
  })

  it('scores a fast correct answer higher than a slow one', async () => {
    const fast = await seedLoop()
    await loadDelivery(db, { token: fast.token, secret: SECRET, now: NOW })
    await recordResponse(db, {
      token: fast.token,
      secret: SECRET,
      now: new Date(NOW.getTime() + 5_000),
      chosenIndex: 0,
    })
    const [fastState] = await db
      .select()
      .from(conceptState)
      .where(eq(conceptState.conceptId, fast.concept.id))

    // A second learner, so the two runs don't share concept_state.
    const other = await seedLearner(db, { email: 'slow@example.com', name: 'Slow' })
    const slowItem = await db.select().from(contentItems).limit(1)
    const slowDelivery = await seedDelivery(db, other.id, slowItem[0].id, {
      status: 'sent',
      sentAt: NOW,
    })
    const slowToken = tokenFor(slowDelivery.id)
    await loadDelivery(db, { token: slowToken, secret: SECRET, now: NOW })
    await recordResponse(db, {
      token: slowToken,
      secret: SECRET,
      now: new Date(NOW.getTime() + 60_000),
      chosenIndex: 0,
    })
    const [slowState] = await db
      .select()
      .from(conceptState)
      .where(eq(conceptState.learnerId, other.id))

    // Quality 5 vs 4 — the ease factor is where that lands.
    expect(fastState.easeFactor).toBeGreaterThan(slowState.easeFactor)
  })

  it('handles a submit with no prior click event', async () => {
    const { token, delivery } = await seedLoop()

    const result = await recordResponse(db, { token, secret: SECRET, now: NOW, chosenIndex: 0 })

    expect(result.ok).toBe(true)
    const [row] = await db.select().from(responses).where(eq(responses.deliveryId, delivery.id))
    expect(row.responseTimeMs).toBeNull()
  })
})
