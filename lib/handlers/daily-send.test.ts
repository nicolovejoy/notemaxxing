import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Db } from '../db'
import { runDailySend, type DailySendDeps } from './daily-send'
import { verifyToken } from '../learning/token'
import { makeFakeSender, type OutboundEmail, type SendFn } from '../email/sender'
import {
  NOW,
  daysFromNow,
  deliveries,
  engagementEvents,
  learners,
  seedConcept,
  seedDelivery,
  seedDueConcept,
  seedItem,
  seedLearner,
  setupDb,
} from '../testkit'

const TOKEN_SECRET = 'test-secret'
const BASE_URL = 'https://example.com'
const FROM = 'daily@example.com'

function makeDeps(send: SendFn, over: Partial<DailySendDeps> = {}): DailySendDeps {
  return { now: NOW, send, tokenSecret: TOKEN_SECRET, baseUrl: BASE_URL, from: FROM, force: true, ...over }
}

/** makeFakeSender() always succeeds — this variant fails, for the failure-path tests. */
function makeFailingSender(error = 'boom'): { send: SendFn; sent: OutboundEmail[] } {
  const sent: OutboundEmail[] = []
  const send: SendFn = async (email) => {
    sent.push(email)
    return { ok: false, messageId: null, error }
  }
  return { send, sent }
}

function urlFromEmail(email: OutboundEmail): string {
  const match = email.text.match(/https?:\/\/\S+/)
  if (!match) throw new Error(`no url found in email text: ${email.text}`)
  return match[0]
}

function tokenFromUrl(url: string): string {
  const marker = '/learn/r/'
  const idx = url.indexOf(marker)
  if (idx === -1) throw new Error(`url missing ${marker}: ${url}`)
  return url.slice(idx + marker.length)
}

async function deliveriesFor(db: Db, learnerId: string) {
  return db.select().from(deliveries).where(eq(deliveries.learnerId, learnerId))
}

let db: Db
let close: () => Promise<void>
let learner: Awaited<ReturnType<typeof seedLearner>>

beforeEach(async () => {
  ;({ db, close } = await setupDb())
  learner = await seedLearner(db)
})

afterEach(async () => {
  await close()
})

describe('happy path', () => {
  it('sends one email to an active learner with a due concept and matching content', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))

    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe(learner.email)
    expect(sent[0].subject).toBeTruthy()
    expect(result.outcomes).toHaveLength(1)
    expect(result.outcomes[0]).toMatchObject({ learnerId: learner.id, status: 'sent' })
  })

  it('marks the delivery row sent with sentAt and resendMessageId', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send } = makeFakeSender()

    await runDailySend(db, makeDeps(send))

    const rows = await deliveriesFor(db, learner.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('sent')
    expect(rows[0].sentAt).toBeInstanceOf(Date)
    expect(rows[0].resendMessageId).toBeTruthy()
  })

  it('writes an email_sent engagement event', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))
    const deliveryId = result.outcomes[0].deliveryId!

    const events = await db
      .select()
      .from(engagementEvents)
      .where(eq(engagementEvents.deliveryId, deliveryId))
    expect(events).toHaveLength(1)
    expect(events[0].eventType).toBe('email_sent')
  })

  it('reports a sent outcome with deliveryId and itemId', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    const item = await seedItem(db, [c.id])
    const { send } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))

    expect(result.outcomes[0]).toMatchObject({
      status: 'sent',
      itemId: item.id,
    })
    expect(result.outcomes[0].deliveryId).toBeTruthy()
  })
})

describe('the token', () => {
  it('is accepted by verifyToken with the same secret', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    await runDailySend(db, makeDeps(send))

    const token = tokenFromUrl(urlFromEmail(sent[0]))
    const verification = verifyToken(token, TOKEN_SECRET, NOW)
    expect(verification.valid).toBe(true)
  })

  it('payload deliveryId matches the delivery row actually created', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))
    const token = tokenFromUrl(urlFromEmail(sent[0]))
    const verification = verifyToken(token, TOKEN_SECRET, NOW)

    expect(verification.valid).toBe(true)
    if (verification.valid) {
      expect(verification.payload.deliveryId).toBe(result.outcomes[0].deliveryId)
    }
  })

  it('does not verify against a different secret', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    await runDailySend(db, makeDeps(send))

    const token = tokenFromUrl(urlFromEmail(sent[0]))
    const verification = verifyToken(token, 'a-completely-different-secret', NOW)
    expect(verification.valid).toBe(false)
  })

  it('builds the url as ${baseUrl}/learn/r/${token} with no double slash when baseUrl has a trailing slash', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    await runDailySend(db, makeDeps(send, { baseUrl: 'https://example.com/' }))

    const url = urlFromEmail(sent[0])
    expect(url.startsWith('https://example.com/learn/r/')).toBe(true)
    expect(url).not.toContain('//learn')
  })
})

describe('idempotency', () => {
  it('running twice in a row sends exactly one email', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    await runDailySend(db, makeDeps(send))
    const second = await runDailySend(db, makeDeps(send))

    expect(sent).toHaveLength(1)
    expect(second.outcomes[0].status).toBe('skipped_already')
  })

  it('a delivery already existing for that learner+day skips without emailing', async () => {
    const item = await seedItem(db, [])
    await seedDelivery(db, learner.id, item.id, { deliveryDate: '2026-07-15' })
    const { send, sent } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))

    expect(sent).toHaveLength(0)
    expect(result.outcomes[0].status).toBe('skipped_already')
  })

  it('concurrent runs send exactly one email; the loser skips cleanly', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()
    const deps = makeDeps(send)

    const [r1, r2] = await Promise.all([runDailySend(db, deps), runDailySend(db, deps)])

    expect(sent).toHaveLength(1)
    const statuses = [...r1.outcomes, ...r2.outcomes].map((o) => o.status)
    expect(statuses.filter((s) => s === 'sent')).toHaveLength(1)
    expect(statuses.filter((s) => s === 'skipped_already')).toHaveLength(1)
  })
})

describe('gates', () => {
  it('an inactive learner gets no email and no outcome', async () => {
    // The content bank is shared and unscoped, so the still-active default
    // `learner` is a legitimate candidate for this concept too — the
    // assertion is that Ghost specifically is untouched, not that nobody sends.
    const inactive = await seedLearner(db, { email: 'ghost@example.com', name: 'Ghost', isActive: false })
    const c = await seedConcept(db, 'ghost-concept')
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))

    expect(sent.every((e) => e.to !== inactive.email)).toBe(true)
    expect(result.outcomes.some((o) => o.learnerId === inactive.id)).toBe(false)
  })

  it('a paused learner (pausedUntil in the future) is skipped_paused with no delivery row', async () => {
    await db.update(learners).set({ pausedUntil: daysFromNow(3) }).where(eq(learners.id, learner.id))
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))

    expect(sent).toHaveLength(0)
    expect(result.outcomes[0].status).toBe('skipped_paused')
    expect(await deliveriesFor(db, learner.id)).toHaveLength(0)
  })

  it('a paused learner whose pause has elapsed sends', async () => {
    await db.update(learners).set({ pausedUntil: daysFromNow(-1) }).where(eq(learners.id, learner.id))
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))

    expect(sent).toHaveLength(1)
    expect(result.outcomes[0].status).toBe('sent')
  })

  it('force:false outside the send hour is skipped_window with no delivery row', async () => {
    // NOW is 15:00Z = 08:00 America/Los_Angeles; the learner's default sendHourLocal is 7.
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send, { force: false }))

    expect(sent).toHaveLength(0)
    expect(result.outcomes[0].status).toBe('skipped_window')
    expect(await deliveriesFor(db, learner.id)).toHaveLength(0)
  })

  it('an empty content bank is skipped_empty_bank with no delivery row', async () => {
    const { send, sent } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))

    expect(sent).toHaveLength(0)
    expect(result.outcomes[0].status).toBe('skipped_empty_bank')
    expect(await deliveriesFor(db, learner.id)).toHaveLength(0)
  })

  it('concepts exist but no content is skipped_empty_bank with no delivery row', async () => {
    await seedDueConcept(db, learner.id, 'action-potential', -3)
    const { send, sent } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))

    expect(sent).toHaveLength(0)
    expect(result.outcomes[0].status).toBe('skipped_empty_bank')
    expect(await deliveriesFor(db, learner.id)).toHaveLength(0)
  })
})

describe('failure', () => {
  it('a failed send marks the delivery failed, reports the error, and writes no email_sent event', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFailingSender('resend is down')

    const result = await runDailySend(db, makeDeps(send))

    expect(sent).toHaveLength(1) // the send was attempted
    expect(result.outcomes[0]).toMatchObject({ status: 'failed', error: 'resend is down' })

    const rows = await deliveriesFor(db, learner.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('failed')

    const events = await db
      .select()
      .from(engagementEvents)
      .where(eq(engagementEvents.deliveryId, rows[0].id))
    expect(events).toHaveLength(0)
  })

  it('leaves the claim in place so a retry does not re-send', async () => {
    const c = await seedDueConcept(db, learner.id, 'action-potential', -3)
    await seedItem(db, [c.id])
    const { send } = makeFailingSender()

    await runDailySend(db, makeDeps(send))
    const retry = await runDailySend(db, makeDeps(send))

    expect(retry.outcomes[0].status).toBe('skipped_already')
  })
})

describe('two learners', () => {
  it('both active learners get their own email with a distinct token/deliveryId', async () => {
    const nico = await seedLearner(db, { email: 'nico@example.com', name: 'Nico' })
    const c = await seedDueConcept(db, learner.id, 'shared-concept', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    const result = await runDailySend(db, makeDeps(send))

    expect(sent).toHaveLength(2)
    expect(result.outcomes.map((o) => o.status)).toEqual(['sent', 'sent'])

    const [deliveryIdA, deliveryIdB] = result.outcomes.map((o) => o.deliveryId)
    expect(deliveryIdA).not.toBe(deliveryIdB)

    const [tokenA, tokenB] = sent.map((e) => tokenFromUrl(urlFromEmail(e)))
    expect(tokenA).not.toBe(tokenB)

    const ids = result.outcomes.map((o) => o.learnerId).sort()
    expect(ids).toEqual([learner.id, nico.id].sort())
  })

  it('one paused learner and one active learner produce exactly one email', async () => {
    await seedLearner(db, { email: 'nico@example.com', name: 'Nico', pausedUntil: daysFromNow(3) })
    const c = await seedDueConcept(db, learner.id, 'shared-concept', -3)
    await seedItem(db, [c.id])
    const { send, sent } = makeFakeSender()

    await runDailySend(db, makeDeps(send))

    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe(learner.email)
  })

  it('both learners can have a delivery on the same date', async () => {
    const nico = await seedLearner(db, { email: 'nico@example.com', name: 'Nico' })
    const c = await seedDueConcept(db, learner.id, 'shared-concept', -3)
    await seedItem(db, [c.id])
    const { send } = makeFakeSender()

    await runDailySend(db, makeDeps(send))

    const rowsA = await deliveriesFor(db, learner.id)
    const rowsB = await deliveriesFor(db, nico.id)
    expect(rowsA).toHaveLength(1)
    expect(rowsB).toHaveLength(1)
    expect(rowsA[0].deliveryDate).toBe(rowsB[0].deliveryDate)
  })
})
