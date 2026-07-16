import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Db } from '../db'
import { deactivateMissing, importBatch } from './import-content'
import { parseBatch, type ContentBatch } from '../content/schema'
import {
  NOW,
  concepts,
  contentItemConcepts,
  contentItems,
  setupDb,
} from '../testkit'

/** Parse a raw fixture the same way the CLI would, so tests exercise the real gate. */
function batch(raw: unknown): ContentBatch {
  const r = parseBatch(raw)
  if (!r.ok) throw new Error('fixture failed validation: ' + r.errors.join('; '))
  return r.batch
}

function oneQuizBatch(over: Record<string, unknown> = {}) {
  return batch({
    batch_id: 'neuro-2026-07',
    concepts: [{ slug: 'action-potential', name: 'Action potential', domain: 'neuro' }],
    items: [
      {
        external_id: 'neuro/ap-rising',
        kind: 'quiz',
        title: 'The rising phase',
        concepts: [{ slug: 'action-potential', primary: true }],
        body: {
          prompt: 'Which ion?',
          options: ['Na+', 'K+'],
          correct_index: 0,
          explanation: 'Sodium.',
        },
      },
    ],
    ...over,
  })
}

let db: Db
let close: () => Promise<void>

beforeEach(async () => {
  ;({ db, close } = await setupDb())
})
afterEach(async () => {
  await close()
})

describe('importBatch — first import', () => {
  it('inserts concepts, items, and their tags', async () => {
    const summary = await importBatch(db, oneQuizBatch(), NOW)

    expect(summary).toEqual({ batchId: 'neuro-2026-07', conceptsUpserted: 1, itemsUpserted: 1 })

    const [concept] = await db.select().from(concepts)
    expect(concept.slug).toBe('action-potential')
    expect(concept.domain).toBe('neuro')

    const [item] = await db.select().from(contentItems)
    expect(item.externalId).toBe('neuro/ap-rising')
    expect(item.importedBatchId).toBe('neuro-2026-07')
    expect((item.body as { correct_index: number }).correct_index).toBe(0)

    const tags = await db.select().from(contentItemConcepts)
    expect(tags).toHaveLength(1)
    expect(tags[0].isPrimary).toBe(true)
  })
})

describe('importBatch — idempotency', () => {
  it('re-importing the same batch does not duplicate rows', async () => {
    await importBatch(db, oneQuizBatch(), NOW)
    await importBatch(db, oneQuizBatch(), NOW)

    expect(await db.select().from(concepts)).toHaveLength(1)
    expect(await db.select().from(contentItems)).toHaveLength(1)
    expect(await db.select().from(contentItemConcepts)).toHaveLength(1)
  })

  it('updates a concept and an item in place on re-import', async () => {
    await importBatch(db, oneQuizBatch(), NOW)

    const edited = oneQuizBatch({
      concepts: [{ slug: 'action-potential', name: 'Action potentials (renamed)', domain: 'neuro/cellular' }],
      items: [
        {
          external_id: 'neuro/ap-rising',
          kind: 'quiz',
          title: 'The rising phase (clarified)',
          concepts: [{ slug: 'action-potential', primary: true }],
          body: { prompt: 'Which ion drives it?', options: ['Na+', 'K+', 'Cl-'], correct_index: 0, explanation: 'Na+.' },
        },
      ],
    })
    await importBatch(db, edited, NOW)

    const [concept] = await db.select().from(concepts)
    expect(concept.name).toBe('Action potentials (renamed)')
    expect(concept.domain).toBe('neuro/cellular')

    const [item] = await db.select().from(contentItems)
    expect(item.title).toBe('The rising phase (clarified)')
    expect((item.body as { options: string[] }).options).toHaveLength(3)
  })

  it('preserves the item id across re-import, so deliveries keep pointing at it', async () => {
    await importBatch(db, oneQuizBatch(), NOW)
    const [before] = await db.select().from(contentItems)

    await importBatch(db, oneQuizBatch(), NOW)
    const [after] = await db.select().from(contentItems)

    expect(after.id).toBe(before.id)
  })

  it('reconciles tags when an item drops a concept', async () => {
    // Import tagging two concepts...
    await importBatch(
      db,
      batch({
        batch_id: 'b',
        concepts: [
          { slug: 'a', name: 'A' },
          { slug: 'b', name: 'B' },
        ],
        items: [
          {
            external_id: 'item-1',
            kind: 'quiz',
            title: 'Q',
            concepts: [
              { slug: 'a', primary: true },
              { slug: 'b' },
            ],
            body: { prompt: 'q?', options: ['x', 'y'], correct_index: 0, explanation: '' },
          },
        ],
      }),
      NOW
    )
    expect(await db.select().from(contentItemConcepts)).toHaveLength(2)

    // ...then re-import with only one tag.
    await importBatch(
      db,
      batch({
        batch_id: 'b',
        concepts: [
          { slug: 'a', name: 'A' },
          { slug: 'b', name: 'B' },
        ],
        items: [
          {
            external_id: 'item-1',
            kind: 'quiz',
            title: 'Q',
            concepts: [{ slug: 'a', primary: true }],
            body: { prompt: 'q?', options: ['x', 'y'], correct_index: 0, explanation: '' },
          },
        ],
      }),
      NOW
    )

    const tags = await db.select().from(contentItemConcepts)
    expect(tags).toHaveLength(1)
    expect(tags[0].isPrimary).toBe(true)
  })
})

describe('importBatch — multiple concepts and items', () => {
  it('wires an adventure tagged to several concepts', async () => {
    await importBatch(
      db,
      batch({
        batch_id: 'b',
        concepts: [
          { slug: 'a', name: 'A' },
          { slug: 'b', name: 'B' },
          { slug: 'c', name: 'C' },
        ],
        items: [
          {
            external_id: 'adv-1',
            kind: 'adventure',
            title: 'Case',
            concepts: [{ slug: 'a', primary: true }, { slug: 'b' }, { slug: 'c' }],
            body: { opening_scenario: 'A patient...', grading_rubric: 'Look for...', max_turns: 8 },
          },
        ],
      }),
      NOW
    )

    const [item] = await db.select().from(contentItems)
    expect(item.kind).toBe('adventure')
    const tags = await db.select().from(contentItemConcepts).where(eq(contentItemConcepts.itemId, item.id))
    expect(tags).toHaveLength(3)
    expect(tags.filter((t) => t.isPrimary)).toHaveLength(1)
  })
})

describe('deactivateMissing', () => {
  it('deactivates items no longer present in the batch, keeping the rest', async () => {
    await importBatch(
      db,
      batch({
        batch_id: 'b',
        concepts: [{ slug: 'a', name: 'A' }],
        items: [
          { external_id: 'keep', kind: 'quiz', title: 'K', concepts: [{ slug: 'a' }], body: { prompt: 'q', options: ['x', 'y'], correct_index: 0, explanation: '' } },
          { external_id: 'drop', kind: 'quiz', title: 'D', concepts: [{ slug: 'a' }], body: { prompt: 'q', options: ['x', 'y'], correct_index: 0, explanation: '' } },
        ],
      }),
      NOW
    )

    const n = await deactivateMissing(db, 'b', ['keep'])
    expect(n).toBe(1)

    const rows = await db.select().from(contentItems)
    const kept = rows.find((r) => r.externalId === 'keep')!
    const dropped = rows.find((r) => r.externalId === 'drop')!
    expect(kept.isActive).toBe(true)
    expect(dropped.isActive).toBe(false)
  })
})
