/**
 * The daily send. Called by the cron route, which is a thin auth check around it.
 *
 * Everything the world touches (db, clock, sender) is a parameter, so this is
 * testable end-to-end against PGlite with a fake sender and nothing on the wire.
 */
import { eq } from 'drizzle-orm'
import type { Db } from '../db'
import { deliveries, engagementEvents, learners } from '../db/schema'
import { activeLearners, hasDeliveryFor, loadSelectionInput } from '../db/queries'
import { selectNextItem } from '../learning/selection'
import { localDayAndHour, shouldSendNow } from '../learning/send-window'
import { signToken } from '../learning/token'
import { renderDailyEmail, type RenderableItem } from '../email/render'
import type { SendFn } from '../email/sender'
import { contentItems } from '../db/schema'

const TOKEN_TTL_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export type DailySendDeps = {
  now: Date
  send: SendFn
  tokenSecret: string
  baseUrl: string
  from: string
  /** Ignore the send-window gate. For manual/forced runs only. */
  force?: boolean
}

export type LearnerOutcome = {
  learnerId: string
  email: string
  status: 'sent' | 'failed' | 'skipped_window' | 'skipped_paused' | 'skipped_already' | 'skipped_empty_bank'
  deliveryId?: string
  itemId?: string
  error?: string
}

export type DailySendResult = {
  ran: boolean
  outcomes: LearnerOutcome[]
}

export async function runDailySend(db: Db, deps: DailySendDeps): Promise<DailySendResult> {
  const people = await activeLearners(db)
  const outcomes: LearnerOutcome[] = []

  for (const learner of people) {
    outcomes.push(await sendForLearner(db, learner, deps))
  }

  return { ran: true, outcomes }
}

async function sendForLearner(
  db: Db,
  learner: typeof learners.$inferSelect,
  deps: DailySendDeps
): Promise<LearnerOutcome> {
  const { now, send, tokenSecret, baseUrl, from, force } = deps
  const base: Pick<LearnerOutcome, 'learnerId' | 'email'> = {
    learnerId: learner.id,
    email: learner.email,
  }

  const { day } = localDayAndHour(now, learner.timezone)

  if (learner.pausedUntil && learner.pausedUntil.getTime() > now.getTime()) {
    return { ...base, status: 'skipped_paused' }
  }

  const already = await hasDeliveryFor(db, learner.id, day)
  if (already) return { ...base, status: 'skipped_already' }

  if (
    !force &&
    !shouldSendNow({
      nowUtc: now,
      timeZone: learner.timezone,
      targetHourLocal: learner.sendHourLocal,
      alreadySentToday: already,
    })
  ) {
    return { ...base, status: 'skipped_window' }
  }

  const choice = selectNextItem(await loadSelectionInput(db, learner.id, now))
  if (choice.chosenItemId === null) {
    // No content, or none tagged to a known concept. Don't email nothing.
    return { ...base, status: 'skipped_empty_bank' }
  }

  // Claim the day BEFORE sending. The unique index on (learner_id, delivery_date)
  // is the real guard — Vercel Cron double-fires, and a second invocation must
  // lose here rather than send a duplicate.
  const claimed = await db
    .insert(deliveries)
    .values({
      learnerId: learner.id,
      deliveryDate: day,
      contentItemId: choice.chosenItemId,
      scheduledSendAt: now,
      status: 'scheduled',
      tokenExpiresAt: new Date(now.getTime() + TOKEN_TTL_DAYS * DAY_MS),
      selectionDebug: {
        score: choice.score,
        fallback: choice.fallback,
        conceptIds: choice.chosenConceptIds,
      },
    })
    .onConflictDoNothing()
    .returning()

  if (claimed.length === 0) return { ...base, status: 'skipped_already' }
  const delivery = claimed[0]

  const [item] = await db
    .select()
    .from(contentItems)
    .where(eq(contentItems.id, choice.chosenItemId))
    .limit(1)

  const renderable: RenderableItem = {
    kind: item.kind as RenderableItem['kind'],
    title: item.title,
    body: (item.body ?? {}) as Record<string, unknown>,
  }

  const token = signToken(
    { deliveryId: delivery.id, exp: Math.floor(delivery.tokenExpiresAt.getTime() / 1000) },
    tokenSecret
  )

  const email = renderDailyEmail({
    learnerName: learner.name,
    item: renderable,
    answerUrl: `${baseUrl.replace(/\/$/, '')}/learn/r/${token}`,
  })

  const result = await send({ from, to: learner.email, ...email })

  if (!result.ok) {
    // Leave the claim in place. Retrying would mean re-picking and re-sending,
    // which is how you double-email someone; a failed day is visible on the
    // dashboard instead.
    await db
      .update(deliveries)
      .set({ status: 'failed' })
      .where(eq(deliveries.id, delivery.id))
    return { ...base, status: 'failed', deliveryId: delivery.id, error: result.error ?? 'send failed' }
  }

  await db
    .update(deliveries)
    .set({ status: 'sent', sentAt: now, resendMessageId: result.messageId })
    .where(eq(deliveries.id, delivery.id))

  await db.insert(engagementEvents).values({
    deliveryId: delivery.id,
    eventType: 'email_sent',
    occurredAt: now,
  })

  return {
    ...base,
    status: 'sent',
    deliveryId: delivery.id,
    itemId: choice.chosenItemId,
  }
}
