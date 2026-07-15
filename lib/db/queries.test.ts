import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Db } from './index'
import {
  loadSelectionInput,
  getConfig,
  setConfig,
  isPaused,
  hasDeliveryFor,
} from './queries'
import {
  NOW,
  daysFromNow,
  seedConcept,
  seedConceptState,
  seedDelivery,
  seedDueConcept,
  seedItem,
  setupDb,
} from '../testkit'

let db: Db
let close: () => Promise<void>

beforeEach(async () => {
  ;({ db, close } = await setupDb())
})

afterEach(async () => {
  await close()
})

describe('loadSelectionInput', () => {
  it('returns empty collections for an empty database', async () => {
    const input = await loadSelectionInput(db, NOW)
    expect(input.concepts).toEqual([])
    expect(input.content).toEqual([])
    expect(input.recentDeliveries).toEqual([])
    expect(input.now).toBe(NOW)
  })

  it('shapes a concept into the pure selector contract', async () => {
    const c = await seedDueConcept(db, 'action-potential', -3)
    const input = await loadSelectionInput(db, NOW)

    expect(input.concepts).toHaveLength(1)
    const got = input.concepts[0]
    expect(got.conceptId).toBe(c.id)
    expect(got.dueAt).toBeInstanceOf(Date)
    expect(got.introducedAt).toBeInstanceOf(Date)
    expect(got.engagementScore).toBe(0.5)
    expect(got.flaggedAt).toBeNull()
  })

  it('includes a concept that has no state row yet, as never-introduced', async () => {
    // A freshly imported concept has no concept_state row. It must still appear
    // as a coverage candidate, or new material could never be introduced.
    const c = await seedConcept(db, 'fresh')
    await seedItem(db, [c.id])

    const input = await loadSelectionInput(db, NOW)
    expect(input.concepts).toHaveLength(1)
    expect(input.concepts[0]).toMatchObject({
      conceptId: c.id,
      dueAt: null,
      introducedAt: null,
      engagementScore: 0.5,
      flaggedAt: null,
    })
  })

  it('excludes inactive concepts', async () => {
    await seedConcept(db, 'retired', { isActive: false })
    const input = await loadSelectionInput(db, NOW)
    expect(input.concepts).toEqual([])
  })

  it('excludes inactive content', async () => {
    const c = await seedDueConcept(db, 'c', -1)
    await seedItem(db, [c.id], { isActive: false })
    const input = await loadSelectionInput(db, NOW)
    expect(input.content).toEqual([])
  })

  it('carries the flag through', async () => {
    const c = await seedConcept(db, 'ignored')
    await seedConceptState(db, c.id, {
      engagementScore: 0.1,
      skipStreak: 3,
      flaggedAt: daysFromNow(-1),
      introducedAt: daysFromNow(-20),
      dueAt: daysFromNow(-1),
    })

    const input = await loadSelectionInput(db, NOW)
    expect(input.concepts[0].flaggedAt).toBeInstanceOf(Date)
    expect(input.concepts[0].engagementScore).toBeCloseTo(0.1, 5)
  })

  it('groups an adventure with all of its tagged concepts', async () => {
    const a = await seedDueConcept(db, 'a', -1)
    const b = await seedDueConcept(db, 'b', -2)
    const item = await seedItem(db, [a.id, b.id], { kind: 'adventure', title: 'Case' })

    const input = await loadSelectionInput(db, NOW)
    expect(input.content).toHaveLength(1)
    expect(input.content[0].itemId).toBe(item.id)
    expect(input.content[0].kind).toBe('adventure')
    expect(input.content[0].conceptIds.sort()).toEqual([a.id, b.id].sort())
  })

  it('does not collapse two items that share a concept', async () => {
    const c = await seedDueConcept(db, 'c', -1)
    await seedItem(db, [c.id], { title: 'one' })
    await seedItem(db, [c.id], { title: 'two' })

    const input = await loadSelectionInput(db, NOW)
    expect(input.content).toHaveLength(2)
  })

  it('omits an item that tags no concept at all', async () => {
    await seedItem(db, [], { title: 'orphan' })
    const input = await loadSelectionInput(db, NOW)
    expect(input.content).toEqual([])
  })

  it('returns recent deliveries inside the novelty window', async () => {
    const c = await seedDueConcept(db, 'c', -1)
    const item = await seedItem(db, [c.id])
    await seedDelivery(db, item.id, {
      deliveryDate: '2026-07-14',
      status: 'sent',
      sentAt: daysFromNow(-1),
    })

    const input = await loadSelectionInput(db, NOW)
    expect(input.recentDeliveries).toHaveLength(1)
    expect(input.recentDeliveries[0].itemId).toBe(item.id)
    expect(input.recentDeliveries[0].conceptIds).toEqual([c.id])
  })

  it('excludes deliveries older than the novelty window', async () => {
    const c = await seedDueConcept(db, 'c', -1)
    const item = await seedItem(db, [c.id])
    await seedDelivery(db, item.id, {
      deliveryDate: '2026-06-01',
      status: 'sent',
      sentAt: daysFromNow(-44),
    })

    const input = await loadSelectionInput(db, NOW)
    expect(input.recentDeliveries).toEqual([])
  })

  it('ignores a scheduled-but-unsent delivery', async () => {
    // Never sent = Max never saw it = it can't make anything stale.
    const c = await seedDueConcept(db, 'c', -1)
    const item = await seedItem(db, [c.id])
    await seedDelivery(db, item.id, { deliveryDate: '2026-07-14', status: 'scheduled' })

    const input = await loadSelectionInput(db, NOW)
    expect(input.recentDeliveries).toEqual([])
  })

  it('produces input the pure selector can consume end to end', async () => {
    const { selectNextItem } = await import('../learning/selection')
    const overdue = await seedDueConcept(db, 'overdue', -20)
    const soon = await seedDueConcept(db, 'soon', 5)
    const overdueItem = await seedItem(db, [overdue.id], { title: 'overdue' })
    await seedItem(db, [soon.id], { title: 'soon' })

    const result = selectNextItem(await loadSelectionInput(db, NOW))
    expect(result.chosenItemId).toBe(overdueItem.id)
  })
})

describe('config', () => {
  it('returns null for a missing key', async () => {
    expect(await getConfig(db, 'learner_timezone')).toBeNull()
  })

  it('round-trips a value', async () => {
    await setConfig(db, 'learner_timezone', 'America/Los_Angeles')
    expect(await getConfig(db, 'learner_timezone')).toBe('America/Los_Angeles')
  })

  it('overwrites on repeat set', async () => {
    await setConfig(db, 'send_hour_local', 7)
    await setConfig(db, 'send_hour_local', 8)
    expect(await getConfig(db, 'send_hour_local')).toBe(8)
  })

  it('stores structured values', async () => {
    await setConfig(db, 'paused_until', { until: '2026-08-01T00:00:00Z' })
    expect(await getConfig(db, 'paused_until')).toEqual({ until: '2026-08-01T00:00:00Z' })
  })

  it('treats setting null as clearing the key', async () => {
    // value is JSONB NOT NULL, so null can't be stored — and every caller reads
    // "paused_until is null" as "not paused", which absence already expresses.
    await setConfig(db, 'paused_until', daysFromNow(3).toISOString())
    await setConfig(db, 'paused_until', null)
    expect(await getConfig(db, 'paused_until')).toBeNull()
  })

  it('clears an already-absent key without throwing', async () => {
    await expect(setConfig(db, 'never_set', null)).resolves.toBeUndefined()
  })

  it('preserves falsy values that are not null', async () => {
    // 0 and false are real settings, not "unset".
    await setConfig(db, 'send_hour_local', 0)
    expect(await getConfig(db, 'send_hour_local')).toBe(0)
    await setConfig(db, 'some_flag', false)
    expect(await getConfig(db, 'some_flag')).toBe(false)
  })
})

describe('isPaused', () => {
  it('is false when unset', async () => {
    expect(await isPaused(db, NOW)).toBe(false)
  })

  it('is true while the pause is in the future', async () => {
    await setConfig(db, 'paused_until', daysFromNow(3).toISOString())
    expect(await isPaused(db, NOW)).toBe(true)
  })

  it('is false once the pause has elapsed', async () => {
    await setConfig(db, 'paused_until', daysFromNow(-1).toISOString())
    expect(await isPaused(db, NOW)).toBe(false)
  })

  it('is false for a null pause', async () => {
    await setConfig(db, 'paused_until', null)
    expect(await isPaused(db, NOW)).toBe(false)
  })
})

describe('hasDeliveryFor', () => {
  it('is false for a day with no delivery', async () => {
    expect(await hasDeliveryFor(db, '2026-07-15')).toBe(false)
  })

  it('is true once a delivery row exists for that local day', async () => {
    const c = await seedDueConcept(db, 'c', -1)
    const item = await seedItem(db, [c.id])
    await seedDelivery(db, item.id, { deliveryDate: '2026-07-15' })
    expect(await hasDeliveryFor(db, '2026-07-15')).toBe(true)
  })

  it('is scoped to the exact day', async () => {
    const c = await seedDueConcept(db, 'c', -1)
    const item = await seedItem(db, [c.id])
    await seedDelivery(db, item.id, { deliveryDate: '2026-07-15' })
    expect(await hasDeliveryFor(db, '2026-07-16')).toBe(false)
  })
})
