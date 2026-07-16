/**
 * Import a validated content batch into the database.
 *
 * Idempotent: concepts upsert on `slug`, items on `external_id`, and an item's
 * concept tags are reconciled (deleted and rewritten) rather than appended. Run
 * the same batch twice and the second run is a no-op in effect — which is the
 * whole point of keeping content in git and re-importing on change.
 *
 * Takes db + an already-parsed batch (see lib/content/schema.ts); does no
 * validation and no file I/O of its own. The CLI wrapper validates first.
 */
import { eq, inArray } from 'drizzle-orm'
import type { Db } from '../db'
import { concepts, contentItemConcepts, contentItems } from '../db/schema'
import type { ContentBatch } from '../content/schema'

export type ImportSummary = {
  batchId: string
  conceptsUpserted: number
  itemsUpserted: number
}

export async function importBatch(db: Db, batch: ContentBatch, now: Date): Promise<ImportSummary> {
  const slugToId = new Map<string, string>()

  for (const c of batch.concepts) {
    const [row] = await db
      .insert(concepts)
      .values({
        slug: c.slug,
        name: c.name,
        description: c.description ?? null,
        domain: c.domain ?? null,
        introPriority: c.intro_priority ?? null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: concepts.slug,
        set: {
          name: c.name,
          description: c.description ?? null,
          domain: c.domain ?? null,
          introPriority: c.intro_priority ?? null,
          isActive: true,
        },
      })
      .returning({ id: concepts.id })
    slugToId.set(c.slug, row.id)
  }

  for (const it of batch.items) {
    const [item] = await db
      .insert(contentItems)
      .values({
        externalId: it.external_id,
        kind: it.kind,
        title: it.title,
        difficulty: it.difficulty,
        estimatedDurationSeconds: it.estimated_duration_seconds ?? null,
        isActive: true,
        body: it.body,
        importedBatchId: batch.batch_id,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: contentItems.externalId,
        set: {
          kind: it.kind,
          title: it.title,
          difficulty: it.difficulty,
          estimatedDurationSeconds: it.estimated_duration_seconds ?? null,
          isActive: true,
          body: it.body,
          importedBatchId: batch.batch_id,
        },
      })
      .returning({ id: contentItems.id })

    // Reconcile tags: an edited batch may have added or dropped concepts on this
    // item. Deleting first keeps that in sync — content_item_concepts has an
    // inbound cascade and nothing references it, so the delete is always safe.
    await db.delete(contentItemConcepts).where(eq(contentItemConcepts.itemId, item.id))

    const tagRows = it.concepts.map((ref) => {
      const conceptId = slugToId.get(ref.slug)
      if (!conceptId) {
        // The schema's referential check makes this unreachable; guard anyway
        // so a future caller that skips validation fails loudly, not silently.
        throw new Error(`item ${it.external_id} references unknown concept ${ref.slug}`)
      }
      return { itemId: item.id, conceptId, isPrimary: ref.primary }
    })
    if (tagRows.length > 0) {
      await db.insert(contentItemConcepts).values(tagRows)
    }
  }

  return {
    batchId: batch.batch_id,
    conceptsUpserted: batch.concepts.length,
    itemsUpserted: batch.items.length,
  }
}

/** Deactivate items previously imported under a batch id but absent from `keepExternalIds`.
 *  Lets an author drop a question from a batch without a hard delete (which a
 *  delivery FK would block anyway). Not called by the basic import — opt-in. */
export async function deactivateMissing(
  db: Db,
  batchId: string,
  keepExternalIds: string[]
): Promise<number> {
  const existing = await db
    .select({ id: contentItems.id, externalId: contentItems.externalId })
    .from(contentItems)
    .where(eq(contentItems.importedBatchId, batchId))

  const keep = new Set(keepExternalIds)
  const toDrop = existing.filter((r) => r.externalId && !keep.has(r.externalId)).map((r) => r.id)
  if (toDrop.length === 0) return 0

  await db.update(contentItems).set({ isActive: false }).where(inArray(contentItems.id, toDrop))
  return toDrop.length
}
