/**
 * Test helpers. Dev-only — never import from app or route code.
 */
import { makeTestDb, type TestDb } from './db/testing'
import type { Db } from './db'
import {
  appConfig,
  chatSessions,
  conceptState,
  concepts,
  contentItemConcepts,
  contentItems,
  deliveries,
  engagementEvents,
  responses,
} from './db/schema'

export type { TestDb }

/**
 * A fresh PGlite database with real migrations applied, typed as the prod `Db`
 * so handlers written against `Db` accept it unmodified.
 */
export async function setupDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const { db, close } = await makeTestDb()
  return { db: db as unknown as Db, close }
}

export const DAY_MS = 24 * 60 * 60 * 1000

/** Fixed clock for deterministic tests. */
export const NOW = new Date('2026-07-15T15:00:00Z')

export function daysFromNow(n: number, from: Date = NOW): Date {
  return new Date(from.getTime() + n * DAY_MS)
}

export async function seedConcept(
  db: Db,
  slug: string,
  over: Partial<typeof concepts.$inferInsert> = {}
) {
  const [row] = await db
    .insert(concepts)
    .values({ slug, name: slug, ...over })
    .returning()
  return row
}

export async function seedConceptState(
  db: Db,
  conceptId: string,
  over: Partial<typeof conceptState.$inferInsert> = {}
) {
  const [row] = await db
    .insert(conceptState)
    .values({ conceptId, ...over })
    .returning()
  return row
}

export async function seedItem(
  db: Db,
  conceptIds: string[],
  over: Partial<typeof contentItems.$inferInsert> = {}
) {
  const [item] = await db
    .insert(contentItems)
    .values({
      kind: 'quiz',
      title: 'Test item',
      body: { prompt: 'q?', options: ['a', 'b'], correct_index: 0, explanation: '' },
      ...over,
    })
    .returning()

  if (conceptIds.length > 0) {
    await db
      .insert(contentItemConcepts)
      .values(conceptIds.map((conceptId, i) => ({ itemId: item.id, conceptId, isPrimary: i === 0 })))
  }
  return item
}

export async function seedDelivery(
  db: Db,
  contentItemId: string,
  over: Partial<typeof deliveries.$inferInsert> = {}
) {
  const [row] = await db
    .insert(deliveries)
    .values({
      contentItemId,
      deliveryDate: '2026-07-15',
      scheduledSendAt: NOW,
      tokenExpiresAt: daysFromNow(7),
      ...over,
    })
    .returning()
  return row
}

/** A concept that has been introduced and is due `dueInDays` from NOW. */
export async function seedDueConcept(db: Db, slug: string, dueInDays: number) {
  const c = await seedConcept(db, slug)
  await seedConceptState(db, c.id, {
    dueAt: daysFromNow(dueInDays),
    introducedAt: daysFromNow(-30),
    lastSeenAt: daysFromNow(-30),
    repetitions: 2,
    intervalDays: 6,
  })
  return c
}

/** Build a Request with a bearer token and JSON body. */
export function req(
  url: string,
  opts: { method?: string; token?: string; body?: unknown } = {}
): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.token) headers.authorization = `Bearer ${opts.token}`
  return new Request(url, {
    method: opts.method ?? 'POST',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

export const TEST_IMPORT_KEY = 'test-import-key-do-not-use-in-prod'

export {
  appConfig,
  chatSessions,
  conceptState,
  concepts,
  contentItemConcepts,
  contentItems,
  deliveries,
  engagementEvents,
  responses,
}
