import { describe, expect, it } from 'vitest'
import { parseBatch } from './schema'

/** A minimal valid batch. Spread and override to probe one failure at a time. */
function validBatch() {
  return {
    batch_id: 'neuro-2026-07',
    concepts: [
      { slug: 'action-potential', name: 'Action potential', domain: 'neuro/cellular', intro_priority: 1 },
      { slug: 'synaptic-transmission', name: 'Synaptic transmission' },
    ],
    items: [
      {
        external_id: 'neuro/ap-rising-phase',
        kind: 'quiz',
        title: 'The rising phase',
        difficulty: 2,
        concepts: [{ slug: 'action-potential', primary: true }],
        body: {
          prompt: 'Which ion influx drives the rising phase?',
          options: ['Sodium', 'Potassium', 'Chloride'],
          correct_index: 0,
          explanation: 'Na+ channels open first.',
        },
      },
    ],
  }
}

describe('parseBatch — accepts', () => {
  it('a well-formed batch', () => {
    const r = parseBatch(validBatch())
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error(r.errors.join('; '))
    expect(r.batch.items[0].difficulty).toBe(2)
  })

  it('fills defaults for optional fields', () => {
    const b = validBatch()
    delete (b.items[0] as { difficulty?: number }).difficulty
    delete (b.items[0].body as { explanation?: string }).explanation

    const r = parseBatch(b)
    if (!r.ok) throw new Error(r.errors.join('; '))
    expect(r.batch.items[0].difficulty).toBe(3) // default
    if (r.batch.items[0].kind !== 'quiz') throw new Error('expected quiz')
    expect(r.batch.items[0].body.explanation).toBe('') // default
  })

  it('an adventure item with its own body shape', () => {
    const b = validBatch()
    b.items.push({
      external_id: 'neuro/ap-case',
      kind: 'adventure',
      title: 'A patient presents',
      concepts: [{ slug: 'synaptic-transmission', primary: true }],
      // @ts-expect-error — mixed item kinds in a plain fixture array
      body: { opening_scenario: 'A 34-year-old...', grading_rubric: 'Look for...', max_turns: 6 },
    })

    const r = parseBatch(b)
    expect(r.ok).toBe(true)
  })
})

describe('parseBatch — rejects', () => {
  function expectError(mutate: (b: ReturnType<typeof validBatch>) => void, needle: string) {
    const b = validBatch()
    mutate(b)
    const r = parseBatch(b)
    expect(r.ok).toBe(false)
    if (r.ok) throw new Error('expected rejection')
    expect(r.errors.join(' | ')).toContain(needle)
  }

  it('correct_index past the last option', () => {
    expectError((b) => {
      ;(b.items[0].body as { correct_index: number }).correct_index = 9
    }, 'correct_index')
  })

  it('fewer than two options', () => {
    expectError((b) => {
      ;(b.items[0].body as { options: string[] }).options = ['only one']
    }, 'options')
  })

  it('an item tagging a concept the batch never defines', () => {
    expectError((b) => {
      b.items[0].concepts = [{ slug: 'nonexistent', primary: true }]
    }, 'unknown concept')
  })

  it('a duplicate concept slug', () => {
    expectError((b) => {
      b.concepts.push({ slug: 'action-potential', name: 'Dup' })
    }, 'duplicate concept slug')
  })

  it('a duplicate item external_id', () => {
    expectError((b) => {
      b.items.push({ ...b.items[0] })
    }, 'duplicate item external_id')
  })

  it('more than one primary concept on an item', () => {
    expectError((b) => {
      b.concepts.push({ slug: 'second', name: 'Second' })
      b.items[0].concepts = [
        { slug: 'action-potential', primary: true },
        { slug: 'second', primary: true },
      ]
    }, 'more than one primary')
  })

  it('an unknown kind', () => {
    expectError((b) => {
      ;(b.items[0] as { kind: string }).kind = 'flashcard'
    }, 'kind')
  })

  it('an empty batch', () => {
    expectError((b) => {
      b.items = []
    }, 'items')
  })
})
