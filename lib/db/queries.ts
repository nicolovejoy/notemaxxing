/**
 * The read side: turns database rows into the pure selector's input contract.
 *
 * Everything here touches the DB and therefore lives OUTSIDE lib/learning/**.
 * Keep the split — these functions load and shape, they never decide.
 */
import { and, eq, gte, inArray } from 'drizzle-orm'
import type { Db } from './index'
import {
  appConfig,
  conceptState,
  concepts,
  contentItemConcepts,
  contentItems,
  deliveries,
} from './schema'
import type { ConceptCandidate, ContentCandidate, RecentDelivery, SelectionInput } from '../learning/types'

const DAY_MS = 24 * 60 * 60 * 1000

/** Must cover the selector's novelty window; a little slack is harmless. */
const RECENT_DELIVERY_DAYS = 7

/** Matches concept_state's column default — see the schema comment on why it's 0.5. */
const DEFAULT_ENGAGEMENT = 0.5

/**
 * Assembles everything selectNextItem needs in one place.
 *
 * Deliberately a LEFT JOIN onto concept_state: a freshly imported concept has
 * no state row yet, and it still has to show up as a coverage candidate or new
 * material could never be introduced at all.
 */
export async function loadSelectionInput(db: Db, now: Date): Promise<SelectionInput> {
  const conceptRows = await db
    .select({
      conceptId: concepts.id,
      dueAt: conceptState.dueAt,
      introducedAt: conceptState.introducedAt,
      engagementScore: conceptState.engagementScore,
      flaggedAt: conceptState.flaggedAt,
    })
    .from(concepts)
    .leftJoin(conceptState, eq(conceptState.conceptId, concepts.id))
    .where(eq(concepts.isActive, true))

  const candidates: ConceptCandidate[] = conceptRows.map((r) => ({
    conceptId: r.conceptId,
    dueAt: r.dueAt ?? null,
    introducedAt: r.introducedAt ?? null,
    engagementScore: r.engagementScore ?? DEFAULT_ENGAGEMENT,
    flaggedAt: r.flaggedAt ?? null,
  }))

  const content = await loadContentCandidates(db)
  const recentDeliveries = await loadRecentDeliveries(db, now)

  return { now, concepts: candidates, content, recentDeliveries }
}

async function loadContentCandidates(db: Db): Promise<ContentCandidate[]> {
  const rows = await db
    .select({
      itemId: contentItems.id,
      kind: contentItems.kind,
      conceptId: contentItemConcepts.conceptId,
    })
    .from(contentItems)
    .innerJoin(contentItemConcepts, eq(contentItemConcepts.itemId, contentItems.id))
    .innerJoin(concepts, eq(concepts.id, contentItemConcepts.conceptId))
    .where(and(eq(contentItems.isActive, true), eq(concepts.isActive, true)))

  // One row per (item, concept) — fold back into one candidate per item.
  const byItem = new Map<string, ContentCandidate>()
  for (const r of rows) {
    const existing = byItem.get(r.itemId)
    if (existing) {
      existing.conceptIds.push(r.conceptId)
    } else {
      byItem.set(r.itemId, {
        itemId: r.itemId,
        kind: r.kind as ContentCandidate['kind'],
        conceptIds: [r.conceptId],
      })
    }
  }
  return [...byItem.values()]
}

/**
 * Only SENT deliveries count. A scheduled-but-never-sent row means Max never
 * saw it, so it can't make anything stale.
 */
async function loadRecentDeliveries(db: Db, now: Date): Promise<RecentDelivery[]> {
  const cutoff = new Date(now.getTime() - RECENT_DELIVERY_DAYS * DAY_MS)

  const rows = await db
    .select({
      id: deliveries.id,
      itemId: deliveries.contentItemId,
      sentAt: deliveries.sentAt,
    })
    .from(deliveries)
    .where(and(eq(deliveries.status, 'sent'), gte(deliveries.sentAt, cutoff)))

  if (rows.length === 0) return []

  const tags = await db
    .select({ itemId: contentItemConcepts.itemId, conceptId: contentItemConcepts.conceptId })
    .from(contentItemConcepts)
    .where(
      inArray(
        contentItemConcepts.itemId,
        rows.map((r) => r.itemId)
      )
    )

  const conceptsByItem = new Map<string, string[]>()
  for (const t of tags) {
    const list = conceptsByItem.get(t.itemId)
    if (list) list.push(t.conceptId)
    else conceptsByItem.set(t.itemId, [t.conceptId])
  }

  return rows.map((r) => ({
    deliveredAt: r.sentAt!,
    itemId: r.itemId,
    conceptIds: conceptsByItem.get(r.itemId) ?? [],
  }))
}

// --- config ---

export async function getConfig<T = unknown>(db: Db, key: string): Promise<T | null> {
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1)
  return row ? (row.value as T) : null
}

/**
 * Setting null CLEARS the key rather than storing it.
 *
 * `value` is JSONB NOT NULL, so a JS null can't round-trip — and "paused_until
 * is null" is the natural way to say "not paused". Deleting keeps that reading
 * true and makes set(null) / clear / never-set all indistinguishable, which is
 * what every caller already assumes.
 */
export async function setConfig(db: Db, key: string, value: unknown): Promise<void> {
  if (value === null || value === undefined) {
    await clearConfig(db, key)
    return
  }
  await db
    .insert(appConfig)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value, updatedAt: new Date() },
    })
}

export async function clearConfig(db: Db, key: string): Promise<void> {
  await db.delete(appConfig).where(eq(appConfig.key, key))
}

/** A pause suppresses sending entirely — finals week, travel. */
export async function isPaused(db: Db, now: Date): Promise<boolean> {
  const until = await getConfig<string | null>(db, 'paused_until')
  if (!until) return false
  return new Date(until).getTime() > now.getTime()
}

/**
 * Cheap pre-check before the cron does any work. The real guard against a
 * double send is deliveries.delivery_date being UNIQUE.
 */
export async function hasDeliveryFor(db: Db, localDay: string): Promise<boolean> {
  const [row] = await db
    .select({ id: deliveries.id })
    .from(deliveries)
    .where(eq(deliveries.deliveryDate, localDay))
    .limit(1)
  return row !== undefined
}
