import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Db } from './index'
import { loadWeekOutcomes } from './queries'
import { NOW, responses, seedConcept, seedDelivery, seedItem, seedLearner, setupDb } from '../testkit'

const WEEK_START = '2026-07-13'
const WEEK_END = '2026-07-19'

let db: Db
let close: () => Promise<void>

beforeEach(async () => {
  ;({ db, close } = await setupDb())
})

afterEach(async () => {
  await close()
})

/** A learner with their own item, ready to receive deliveries. */
async function seedLearnerWithItem(email: string) {
  const learner = await seedLearner(db, { email })
  const concept = await seedConcept(db, `concept-${email}`)
  const item = await seedItem(db, [concept.id])
  return { learner, item }
}

async function answer(
  deliveryId: string,
  over: { isCorrect?: boolean | null; abandoned?: boolean } = {}
) {
  await db.insert(responses).values({
    deliveryId,
    answerPayload: { chosen_index: 0 },
    isCorrect: over.isCorrect ?? true,
    abandoned: over.abandoned ?? false,
  })
}

describe('loadWeekOutcomes', () => {
  it('returns only sent deliveries — scheduled and failed are invisible', async () => {
    const { learner, item } = await seedLearnerWithItem('max@example.com')
    await seedDelivery(db, learner.id, item.id, {
      deliveryDate: '2026-07-14',
      status: 'sent',
      sentAt: NOW,
    })
    await seedDelivery(db, learner.id, item.id, {
      deliveryDate: '2026-07-15',
      status: 'scheduled',
    })
    await seedDelivery(db, learner.id, item.id, {
      deliveryDate: '2026-07-16',
      status: 'failed',
    })

    const outcomes = await loadWeekOutcomes(db, WEEK_START, WEEK_END)

    expect(outcomes).toHaveLength(1)
    expect(outcomes[0].deliveryDate).toBe('2026-07-14')
  })

  it('includes both boundary days and excludes just outside them', async () => {
    const { learner, item } = await seedLearnerWithItem('max@example.com')
    for (const deliveryDate of ['2026-07-12', '2026-07-13', '2026-07-19', '2026-07-20']) {
      await seedDelivery(db, learner.id, item.id, { deliveryDate, status: 'sent', sentAt: NOW })
    }

    const outcomes = await loadWeekOutcomes(db, WEEK_START, WEEK_END)

    expect(outcomes.map((o) => o.deliveryDate)).toEqual(['2026-07-13', '2026-07-19'])
  })

  it('shapes an unanswered delivery as answered:false, correct:null', async () => {
    const { learner, item } = await seedLearnerWithItem('max@example.com')
    await seedDelivery(db, learner.id, item.id, {
      deliveryDate: '2026-07-15',
      status: 'sent',
      sentAt: NOW,
    })

    const outcomes = await loadWeekOutcomes(db, WEEK_START, WEEK_END)

    expect(outcomes).toEqual([
      { learnerId: learner.id, deliveryDate: '2026-07-15', answered: false, correct: null },
    ])
  })

  it('carries correctness through for answered deliveries', async () => {
    const { learner, item } = await seedLearnerWithItem('max@example.com')
    const right = await seedDelivery(db, learner.id, item.id, {
      deliveryDate: '2026-07-14',
      status: 'sent',
      sentAt: NOW,
    })
    const wrong = await seedDelivery(db, learner.id, item.id, {
      deliveryDate: '2026-07-15',
      status: 'sent',
      sentAt: NOW,
    })
    await answer(right.id, { isCorrect: true })
    await answer(wrong.id, { isCorrect: false })

    const outcomes = await loadWeekOutcomes(db, WEEK_START, WEEK_END)

    expect(outcomes).toEqual([
      { learnerId: learner.id, deliveryDate: '2026-07-14', answered: true, correct: true },
      { learnerId: learner.id, deliveryDate: '2026-07-15', answered: true, correct: false },
    ])
  })

  it('treats an abandoned response as unanswered', async () => {
    const { learner, item } = await seedLearnerWithItem('max@example.com')
    const delivery = await seedDelivery(db, learner.id, item.id, {
      deliveryDate: '2026-07-15',
      status: 'sent',
      sentAt: NOW,
    })
    await answer(delivery.id, { isCorrect: null, abandoned: true })

    const outcomes = await loadWeekOutcomes(db, WEEK_START, WEEK_END)

    expect(outcomes).toEqual([
      { learnerId: learner.id, deliveryDate: '2026-07-15', answered: false, correct: null },
    ])
  })

  it('spans all learners, ordered by learner then date', async () => {
    const a = await seedLearnerWithItem('a@example.com')
    const b = await seedLearnerWithItem('b@example.com')
    // Insert out of order on purpose.
    await seedDelivery(db, b.learner.id, b.item.id, {
      deliveryDate: '2026-07-15',
      status: 'sent',
      sentAt: NOW,
    })
    const answeredA = await seedDelivery(db, a.learner.id, a.item.id, {
      deliveryDate: '2026-07-16',
      status: 'sent',
      sentAt: NOW,
    })
    await seedDelivery(db, a.learner.id, a.item.id, {
      deliveryDate: '2026-07-14',
      status: 'sent',
      sentAt: NOW,
    })
    await answer(answeredA.id, { isCorrect: true })

    const outcomes = await loadWeekOutcomes(db, WEEK_START, WEEK_END)

    expect(outcomes).toHaveLength(3)
    // Grouped by learner, ascending dates within each learner.
    const byLearner = new Map<string, string[]>()
    for (const o of outcomes) {
      const list = byLearner.get(o.learnerId) ?? []
      list.push(o.deliveryDate)
      byLearner.set(o.learnerId, list)
    }
    expect(byLearner.get(a.learner.id)).toEqual(['2026-07-14', '2026-07-16'])
    expect(byLearner.get(b.learner.id)).toEqual(['2026-07-15'])
    // Learner blocks are contiguous and sorted.
    const learnerSequence = outcomes.map((o) => o.learnerId)
    expect(learnerSequence).toEqual([...learnerSequence].sort())
    // Mixed answered state survives the join.
    const answered = outcomes.find((o) => o.deliveryDate === '2026-07-16')
    expect(answered).toMatchObject({ answered: true, correct: true })
  })
})
