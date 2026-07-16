/**
 * The authored content bank, as a validated shape.
 *
 * Content is hand-written JSON in git (see content/*.json) and imported by
 * scripts/import-content.ts. This module is the gate: a batch that fails here
 * never reaches the database, so a bad correct_index fails on the author's
 * machine, not in a learner's inbox.
 *
 * Pure — zod only, no I/O. Body keys are snake_case because that's how the
 * render and respond layers already read them (item.body.correct_index, etc.);
 * keeping the authored JSON in the same shape means no translation step to drift.
 */
import { z } from 'zod'

const quizBody = z
  .object({
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correct_index: z.number().int().nonnegative(),
    explanation: z.string().default(''),
  })
  .refine((b) => b.correct_index < b.options.length, {
    message: 'correct_index points past the last option',
    path: ['correct_index'],
  })

const adventureBody = z.object({
  opening_scenario: z.string().min(1),
  grading_rubric: z.string().min(1),
  max_turns: z.number().int().positive().default(8),
})

const conceptRef = z.object({
  slug: z.string().min(1),
  primary: z.boolean().default(false),
})

const conceptDef = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  domain: z.string().optional(),
  intro_priority: z.number().int().optional(),
})

const itemBase = {
  external_id: z.string().min(1),
  title: z.string().min(1),
  difficulty: z.number().int().min(1).max(5).default(3),
  estimated_duration_seconds: z.number().int().positive().optional(),
  concepts: z.array(conceptRef).min(1),
}

const quizItem = z.object({ ...itemBase, kind: z.literal('quiz'), body: quizBody })
const adventureItem = z.object({ ...itemBase, kind: z.literal('adventure'), body: adventureBody })

const item = z.discriminatedUnion('kind', [quizItem, adventureItem])

export const contentBatchSchema = z
  .object({
    batch_id: z.string().min(1),
    concepts: z.array(conceptDef).min(1),
    items: z.array(item).min(1),
  })
  .superRefine((batch, ctx) => {
    const slugs = new Set<string>()
    for (const c of batch.concepts) {
      if (slugs.has(c.slug)) {
        ctx.addIssue({ code: 'custom', message: `duplicate concept slug: ${c.slug}`, path: ['concepts'] })
      }
      slugs.add(c.slug)
    }

    const externalIds = new Set<string>()
    batch.items.forEach((it, i) => {
      if (externalIds.has(it.external_id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate item external_id: ${it.external_id}`,
          path: ['items', i, 'external_id'],
        })
      }
      externalIds.add(it.external_id)

      // Every concept an item tags must be defined in this same batch. A batch
      // is self-contained by design — no dangling references to resolve later.
      it.concepts.forEach((ref, j) => {
        if (!slugs.has(ref.slug)) {
          ctx.addIssue({
            code: 'custom',
            message: `item "${it.external_id}" tags unknown concept: ${ref.slug}`,
            path: ['items', i, 'concepts', j, 'slug'],
          })
        }
      })

      if (it.concepts.filter((r) => r.primary).length > 1) {
        ctx.addIssue({
          code: 'custom',
          message: `item "${it.external_id}" has more than one primary concept`,
          path: ['items', i, 'concepts'],
        })
      }
    })
  })

export type ContentBatch = z.infer<typeof contentBatchSchema>
export type ContentItemInput = z.infer<typeof item>
export type ConceptDefInput = z.infer<typeof conceptDef>

export type ParseResult =
  | { ok: true; batch: ContentBatch }
  | { ok: false; errors: string[] }

/** Validate raw JSON into a batch, or a flat list of human-readable errors. */
export function parseBatch(raw: unknown): ParseResult {
  const result = contentBatchSchema.safeParse(raw)
  if (result.success) return { ok: true, batch: result.data }
  const errors = result.error.issues.map((iss) => {
    const path = iss.path.join('.')
    return path ? `${path}: ${iss.message}` : iss.message
  })
  return { ok: false, errors }
}
