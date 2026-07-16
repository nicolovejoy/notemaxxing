import { describe, expect, it } from 'vitest'
import { selectNextItem, DEFAULT_WEIGHTS } from './selection'
import type { ConceptCandidate, ContentCandidate, SelectionInput } from './types'

const NOW = new Date('2026-07-15T15:00:00Z')
const DAY = 24 * 60 * 60 * 1000

function daysFromNow(n: number): Date {
  return new Date(NOW.getTime() + n * DAY)
}

/** Introduced, unflagged, neutral engagement, due `dueInDays` from now. */
function concept(id: string, dueInDays: number, over: Partial<ConceptCandidate> = {}): ConceptCandidate {
  return {
    conceptId: id,
    dueAt: daysFromNow(dueInDays),
    introducedAt: daysFromNow(-30),
    engagementScore: 0.5,
    flaggedAt: null,
    ...over,
  }
}

/** Never introduced — a coverage candidate, not a due one. */
function freshConcept(id: string, over: Partial<ConceptCandidate> = {}): ConceptCandidate {
  return {
    conceptId: id,
    dueAt: null,
    introducedAt: null,
    engagementScore: 0.5,
    flaggedAt: null,
    ...over,
  }
}

function item(itemId: string, conceptIds: string[], kind: 'quiz' | 'adventure' = 'quiz'): ContentCandidate {
  return { itemId, kind, conceptIds }
}

function input(over: Partial<SelectionInput> = {}): SelectionInput {
  return { now: NOW, concepts: [], content: [], recentDeliveries: [], ...over }
}

function chosen(result: ReturnType<typeof selectNextItem>): string | null {
  return result.chosenItemId
}

describe('selectNextItem', () => {
  describe('empty bank', () => {
    it('returns empty_bank when there is no content at all', () => {
      const r = selectNextItem(input({ concepts: [concept('c1', -1)] }))
      expect(r).toEqual({ chosenItemId: null, reason: 'empty_bank' })
    })

    it('returns empty_bank when content exists but tags no known concept', () => {
      const r = selectNextItem(
        input({ concepts: [concept('c1', -1)], content: [item('i1', ['ghost'])] })
      )
      expect(r).toEqual({ chosenItemId: null, reason: 'empty_bank' })
    })
  })

  describe('coverage — cold start', () => {
    it('picks the never-introduced concept on a totally cold start', () => {
      const r = selectNextItem(
        input({ concepts: [freshConcept('c1')], content: [item('i1', ['c1'])] })
      )
      expect(chosen(r)).toBe('i1')
    })

    it('a never-introduced concept scores coverage, not due', () => {
      const r = selectNextItem(
        input({ concepts: [freshConcept('c1')], content: [item('i1', ['c1'])] })
      )
      if (r.chosenItemId === null) throw new Error('expected a pick')
      const b = r.scoredCandidates[0].breakdown[0]
      expect(b.coverage).toBe(1)
      expect(b.due).toBe(0)
    })

    it('introducing new material beats reviewing something due next week', () => {
      const r = selectNextItem(
        input({
          concepts: [freshConcept('new'), concept('old', 7)],
          content: [item('i-new', ['new']), item('i-old', ['old'])],
        })
      )
      expect(chosen(r)).toBe('i-new')
    })
  })

  describe('due pressure', () => {
    it('overdue by 20 days beats due today', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('overdue', -20), concept('today', 0)],
          content: [item('i-overdue', ['overdue']), item('i-today', ['today'])],
        })
      )
      expect(chosen(r)).toBe('i-overdue')
    })

    it('due today beats due in two weeks', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('today', 0), concept('later', 14)],
          content: [item('i-today', ['today']), item('i-later', ['later'])],
        })
      )
      expect(chosen(r)).toBe('i-today')
    })

    it('due score is monotonic — more overdue never scores lower', () => {
      const scores = [14, 7, 0, -7, -14].map((d) => {
        const r = selectNextItem(
          input({ concepts: [concept('c', d)], content: [item('i', ['c'])] })
        )
        if (r.chosenItemId === null) throw new Error('expected a pick')
        return r.scoredCandidates[0].breakdown[0].due
      })
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1])
      }
    })

    it('keeps the due score within [0,1] at both extremes', () => {
      for (const d of [-365, 365]) {
        const r = selectNextItem(
          input({ concepts: [concept('c', d)], content: [item('i', ['c'])] })
        )
        if (r.chosenItemId === null) throw new Error('expected a pick')
        const due = r.scoredCandidates[0].breakdown[0].due
        expect(due).toBeGreaterThanOrEqual(0)
        expect(due).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('flagged, not dropped', () => {
    it('a flagged concept outranks an unflagged one with identical low engagement', () => {
      const r = selectNextItem(
        input({
          concepts: [
            concept('ignored', 0, { engagementScore: 0.1, flaggedAt: daysFromNow(-2) }),
            concept('normal', 0, { engagementScore: 0.1, flaggedAt: null }),
          ],
          content: [item('i-ignored', ['ignored']), item('i-normal', ['normal'])],
        })
      )
      // This is the test that pins "flagged, not dropped". Without the floor,
      // a concept Max ignores sinks in the weighted sum and never resurfaces.
      expect(chosen(r)).toBe('i-ignored')
    })

    it('raises a flagged concept to the engagement floor, not above it', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('c', 0, { engagementScore: 0.1, flaggedAt: daysFromNow(-2) })],
          content: [item('i', ['c'])],
        })
      )
      if (r.chosenItemId === null) throw new Error('expected a pick')
      expect(r.scoredCandidates[0].breakdown[0].engagement).toBe(0.6)
    })

    it('never lowers a flagged concept that is already engaging', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('c', 0, { engagementScore: 0.9, flaggedAt: daysFromNow(-2) })],
          content: [item('i', ['c'])],
        })
      )
      if (r.chosenItemId === null) throw new Error('expected a pick')
      expect(r.scoredCandidates[0].breakdown[0].engagement).toBe(0.9)
    })

    it('flagging reweights but does not exclude — a genuinely urgent concept still wins', () => {
      const r = selectNextItem(
        input({
          concepts: [
            concept('flagged', 30, { engagementScore: 0.1, flaggedAt: daysFromNow(-2) }),
            concept('urgent', -30, { engagementScore: 0.5 }),
          ],
          content: [item('i-flagged', ['flagged']), item('i-urgent', ['urgent'])],
        })
      )
      // The flag is a floor inside the same additive formula, not a filter and
      // not an override — so real urgency still outranks it.
      expect(chosen(r)).toBe('i-urgent')
    })

    it('never filters a flagged concept out of the candidate set', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('flagged', 0, { flaggedAt: daysFromNow(-1) })],
          content: [item('i', ['flagged'])],
        })
      )
      expect(chosen(r)).toBe('i')
    })
  })

  describe('multi-concept items use max, not average', () => {
    it('an adventure surfaces on its most urgent concept, not a diluted mean', () => {
      const r = selectNextItem(
        input({
          concepts: [
            concept('overdue', -30),
            concept('mastered', 90),
            concept('mid', -2),
          ],
          // The adventure averages badly (one overdue, one long-mastered) but
          // maxes well. It should still win on the overdue concept's urgency.
          content: [item('i-adv', ['overdue', 'mastered'], 'adventure'), item('i-mid', ['mid'])],
        })
      )
      expect(chosen(r)).toBe('i-adv')
    })

    it('scores an item at its best concept', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('a', -30), concept('b', 90)],
          content: [item('i', ['a', 'b'], 'adventure')],
        })
      )
      if (r.chosenItemId === null) throw new Error('expected a pick')
      const best = Math.max(...r.scoredCandidates[0].breakdown.map((b) => b.total))
      expect(r.scoredCandidates[0].score).toBeCloseTo(best, 10)
    })

    it('reports every tagged concept in the breakdown', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('a', -30), concept('b', 90)],
          content: [item('i', ['a', 'b'], 'adventure')],
        })
      )
      if (r.chosenItemId === null) throw new Error('expected a pick')
      expect(r.scoredCandidates[0].breakdown.map((b) => b.conceptId).sort()).toEqual(['a', 'b'])
    })

    it('returns all tagged concepts as chosenConceptIds', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('a', -30), concept('b', 90)],
          content: [item('i', ['a', 'b'], 'adventure')],
        })
      )
      if (r.chosenItemId === null) throw new Error('expected a pick')
      expect(r.chosenConceptIds.sort()).toEqual(['a', 'b'])
    })
  })

  describe('novelty penalty', () => {
    it('penalizes an item delivered yesterday', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('a', -5), concept('b', -4)],
          content: [item('i-recent', ['a']), item('i-fresh', ['b'])],
          recentDeliveries: [
            { deliveredAt: daysFromNow(-1), itemId: 'i-recent', conceptIds: ['a'] },
          ],
        })
      )
      // i-recent has the better raw due score but was just shown.
      expect(chosen(r)).toBe('i-fresh')
    })

    it('is a penalty, not an exclusion — enough urgency still wins through it', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('a', -365), concept('b', 13)],
          content: [item('i-recent', ['a']), item('i-fresh', ['b'])],
          recentDeliveries: [
            { deliveredAt: daysFromNow(-1), itemId: 'i-recent', conceptIds: ['a'] },
          ],
        })
      )
      expect(chosen(r)).toBe('i-recent')
    })

    it('penalizes an item whose concept was covered recently, even by a different item', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('a', -5)],
          content: [item('i-other', ['a'])],
          recentDeliveries: [
            { deliveredAt: daysFromNow(-1), itemId: 'i-was-shown', conceptIds: ['a'] },
          ],
        })
      )
      if (r.chosenItemId === null) throw new Error('expected a pick')
      expect(r.scoredCandidates[0].noveltyPenalized).toBe(true)
    })

    it('does not penalize a delivery older than the window', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('a', -5)],
          content: [item('i', ['a'])],
          recentDeliveries: [
            { deliveredAt: daysFromNow(-10), itemId: 'i', conceptIds: ['a'] },
          ],
        })
      )
      if (r.chosenItemId === null) throw new Error('expected a pick')
      expect(r.scoredCandidates[0].noveltyPenalized).toBe(false)
    })
  })

  describe('fallback — the daily email always goes out', () => {
    it('never returns null when the bank is non-empty, even with nothing due', () => {
      const r = selectNextItem(
        input({
          concepts: [
            concept('a', 365, { engagementScore: 0 }),
            concept('b', 200, { engagementScore: 0 }),
          ],
          content: [item('i-a', ['a']), item('i-b', ['b'])],
          weights: { due: 0, engagement: 0, coverage: 0 },
        })
      )
      expect(r.chosenItemId).not.toBeNull()
    })

    it('falls back to the soonest-due concept when nothing scores', () => {
      const r = selectNextItem(
        input({
          concepts: [
            concept('far', 365, { engagementScore: 0 }),
            concept('sooner', 200, { engagementScore: 0 }),
          ],
          content: [item('i-far', ['far']), item('i-sooner', ['sooner'])],
          weights: { due: 0, engagement: 0, coverage: 0 },
        })
      )
      if (r.chosenItemId === null) throw new Error('expected a pick')
      expect(r.chosenItemId).toBe('i-sooner')
      expect(r.fallback).toBe(true)
    })

    it('marks a normal pick as not a fallback', () => {
      const r = selectNextItem(
        input({ concepts: [concept('a', -5)], content: [item('i', ['a'])] })
      )
      if (r.chosenItemId === null) throw new Error('expected a pick')
      expect(r.fallback).toBe(false)
    })
  })

  describe('purity', () => {
    it('is deterministic — identical input gives identical output', () => {
      const build = () =>
        input({
          concepts: [concept('a', -5), freshConcept('b'), concept('c', 3)],
          content: [item('i1', ['a']), item('i2', ['b']), item('i3', ['c'])],
          recentDeliveries: [{ deliveredAt: daysFromNow(-1), itemId: 'i1', conceptIds: ['a'] }],
        })
      expect(selectNextItem(build())).toEqual(selectNextItem(build()))
    })

    it('breaks ties on itemId, never randomly', () => {
      const build = (ids: string[]) =>
        input({
          concepts: [concept('a', 0)],
          content: ids.map((id) => item(id, ['a'])),
        })
      // Same concept, same score — order of the content array must not matter.
      expect(chosen(selectNextItem(build(['z', 'm', 'a'])))).toBe('a')
      expect(chosen(selectNextItem(build(['a', 'm', 'z'])))).toBe('a')
    })

    it('does not mutate its input', () => {
      const i = input({
        concepts: [concept('a', -5)],
        content: [item('i1', ['a'])],
        recentDeliveries: [{ deliveredAt: daysFromNow(-1), itemId: 'i1', conceptIds: ['a'] }],
      })
      const snapshot = structuredClone(i)
      selectNextItem(i)
      expect(i).toEqual(snapshot)
    })
  })

  describe('weights', () => {
    it('exposes due-dominant defaults', () => {
      // A product call, not derivable from the spec: engagement must not
      // out-shout spaced repetition on material Max already knows.
      expect(DEFAULT_WEIGHTS.due).toBeGreaterThan(DEFAULT_WEIGHTS.engagement)
    })

    it('keeps the novelty penalty surmountable by due pressure', () => {
      // Regression guard. At noveltyPenalty >= due, the penalty exceeds the
      // entire due range and silently becomes an exclusion — a badly overdue
      // concept gets benched for the whole window no matter how urgent.
      expect(DEFAULT_WEIGHTS.noveltyPenalty).toBeLessThan(DEFAULT_WEIGHTS.due)
    })

    it('honours a weight override', () => {
      const concepts = [
        concept('engaging', 30, { engagementScore: 1 }),
        concept('due', -30, { engagementScore: 0 }),
      ]
      const content = [item('i-engaging', ['engaging']), item('i-due', ['due'])]

      expect(chosen(selectNextItem(input({ concepts, content })))).toBe('i-due')
      expect(
        chosen(
          selectNextItem(
            input({ concepts, content, weights: { due: 0, engagement: 1, coverage: 0 } })
          )
        )
      ).toBe('i-engaging')
    })

    it('ignores content tagged with an unknown concept but still picks a valid one', () => {
      const r = selectNextItem(
        input({
          concepts: [concept('known', -5)],
          content: [item('i-ghost', ['unknown']), item('i-known', ['known'])],
        })
      )
      expect(chosen(r)).toBe('i-known')
    })
  })
})
