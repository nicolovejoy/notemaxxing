import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { makeTestDb, type TestDb } from './testing'
import { concepts, conceptState, contentItems, contentItemConcepts, learners } from './schema'

let db: TestDb
let close: () => Promise<void>

beforeEach(async () => {
  ;({ db, close } = await makeTestDb())
})

afterEach(async () => {
  await close()
})

async function seedLearner(email = 'max@example.com') {
  const [row] = await db.insert(learners).values({ email, name: 'Max' }).returning()
  return row
}

describe('schema', () => {
  it('applies the real migrations and round-trips a concept', async () => {
    const [c] = await db
      .insert(concepts)
      .values({ slug: 'action-potential', name: 'Action potential propagation' })
      .returning()

    expect(c.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(c.isActive).toBe(true)
    expect(c.createdAt).toBeInstanceOf(Date)
  })

  it('defaults concept_state to the neutral 0.5 engagement prior, not 0', async () => {
    const learner = await seedLearner()
    const [c] = await db.insert(concepts).values({ slug: 's', name: 'S' }).returning()
    const [state] = await db
      .insert(conceptState)
      .values({ learnerId: learner.id, conceptId: c.id })
      .returning()

    // 0 would make a never-shown concept indistinguishable from an ignored one.
    expect(state.engagementScore).toBe(0.5)
    expect(state.easeFactor).toBe(2.5)
    expect(state.dueAt).toBeNull()
    expect(state.introducedAt).toBeNull()
    expect(state.skipStreak).toBe(0)
  })

  it('rejects a content item whose kind is not quiz or adventure', async () => {
    await expect(
      db.insert(contentItems).values({ kind: 'essay', title: 'x', body: {} })
    ).rejects.toThrow()
  })

  it('rejects difficulty outside 1..5', async () => {
    await expect(
      db.insert(contentItems).values({ kind: 'quiz', title: 'x', body: {}, difficulty: 9 })
    ).rejects.toThrow()
  })

  it('rejects an engagement score outside 0..1', async () => {
    const learner = await seedLearner()
    const [c] = await db.insert(concepts).values({ slug: 's', name: 'S' }).returning()
    await expect(
      db
        .insert(conceptState)
        .values({ learnerId: learner.id, conceptId: c.id, engagementScore: 1.5 })
    ).rejects.toThrow()
  })

  it('stores kind-specific payload opaquely in body', async () => {
    const body = {
      prompt: 'Which ion drives depolarization?',
      options: ['Na+', 'K+', 'Cl-', 'Ca2+'],
      correct_index: 0,
      explanation: 'Sodium influx.',
    }
    const [item] = await db
      .insert(contentItems)
      .values({ kind: 'quiz', title: 'Depolarization', body })
      .returning()

    expect(item.body).toEqual(body)
  })

  it('lets one item tag several concepts', async () => {
    const [a] = await db.insert(concepts).values({ slug: 'a', name: 'A' }).returning()
    const [b] = await db.insert(concepts).values({ slug: 'b', name: 'B' }).returning()
    const [item] = await db
      .insert(contentItems)
      .values({ kind: 'adventure', title: 'Case', body: {} })
      .returning()

    await db.insert(contentItemConcepts).values([
      { itemId: item.id, conceptId: a.id, isPrimary: true },
      { itemId: item.id, conceptId: b.id },
    ])

    const rows = await db.select().from(contentItemConcepts)
    expect(rows).toHaveLength(2)
  })

  it('enforces one concept_state row per (learner, concept), but allows the same concept across learners', async () => {
    const max = await seedLearner('max@example.com')
    const nico = await seedLearner('nico@example.com')
    const [c] = await db.insert(concepts).values({ slug: 's', name: 'S' }).returning()

    await db.insert(conceptState).values({ learnerId: max.id, conceptId: c.id })
    // Same concept, different learner — allowed. Max being fluent says nothing
    // about whether Nico is.
    await expect(
      db.insert(conceptState).values({ learnerId: nico.id, conceptId: c.id })
    ).resolves.not.toThrow()
    // Same (learner, concept) twice — rejected.
    await expect(
      db.insert(conceptState).values({ learnerId: max.id, conceptId: c.id })
    ).rejects.toThrow()
  })

  it('enforces unique learner email', async () => {
    await db.insert(learners).values({ email: 'max@example.com', name: 'Max' })
    await expect(
      db.insert(learners).values({ email: 'max@example.com', name: 'Max Again' })
    ).rejects.toThrow()
  })

  it('rejects send_hour_local outside 0..23', async () => {
    await expect(
      db.insert(learners).values({ email: 'a@example.com', name: 'A', sendHourLocal: 24 })
    ).rejects.toThrow()
    await expect(
      db.insert(learners).values({ email: 'b@example.com', name: 'B', sendHourLocal: -1 })
    ).rejects.toThrow()
  })

  it('accepts send_hour_local at the boundaries', async () => {
    await expect(
      db.insert(learners).values({ email: 'a@example.com', name: 'A', sendHourLocal: 0 })
    ).resolves.not.toThrow()
    await expect(
      db.insert(learners).values({ email: 'b@example.com', name: 'B', sendHourLocal: 23 })
    ).resolves.not.toThrow()
  })
})
