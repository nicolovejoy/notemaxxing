import { describe, expect, it } from 'vitest'
import {
  POINTS_ANSWER,
  POINTS_CORRECT_BONUS,
  computeScoreboard,
  endOfWeek,
  startOfWeek,
  type WeekOutcomeRow,
} from './scoreboard'

const MAX = { id: 'learner-max', name: 'Max' }
const NICO = { id: 'learner-nico', name: 'Nico' }

function row(overrides: Partial<WeekOutcomeRow> & { learnerId: string }): WeekOutcomeRow {
  return {
    deliveryDate: '2026-07-20',
    answered: true,
    correct: true,
    ...overrides,
  }
}

describe('startOfWeek', () => {
  it('a Monday maps to itself', () => {
    expect(startOfWeek('2026-07-20')).toBe('2026-07-20')
  })

  it('mid-week maps back to the preceding Monday', () => {
    expect(startOfWeek('2026-07-23')).toBe('2026-07-20')
  })

  it('a Sunday maps back 6 days, not forward', () => {
    expect(startOfWeek('2026-07-26')).toBe('2026-07-20')
  })

  it('crosses a month boundary', () => {
    // Sat 2026-08-01 -> Mon 2026-07-27
    expect(startOfWeek('2026-08-01')).toBe('2026-07-27')
  })

  it('crosses a year boundary', () => {
    // Fri 2027-01-01 -> Mon 2026-12-28
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28')
  })
})

describe('computeScoreboard', () => {
  it('learners with zero rows still get zero-point entries', () => {
    const board = computeScoreboard([MAX, NICO], [], '2026-07-20')

    expect(board.weekStart).toBe('2026-07-20')
    expect(board.entries).toHaveLength(2)
    for (const entry of board.entries) {
      expect(entry.points).toBe(0)
      expect(entry.answeredCount).toBe(0)
      expect(entry.correctCount).toBe(0)
    }
    expect(board.leaderId).toBeNull()
  })

  it('empty learner list yields empty entries and null leader', () => {
    const board = computeScoreboard([], [], '2026-07-20')
    expect(board.entries).toEqual([])
    expect(board.leaderId).toBeNull()
  })

  it('correct answer scores POINTS_ANSWER + POINTS_CORRECT_BONUS', () => {
    const board = computeScoreboard(
      [MAX],
      [row({ learnerId: MAX.id, answered: true, correct: true })],
      '2026-07-20'
    )

    expect(board.entries[0].points).toBe(POINTS_ANSWER + POINTS_CORRECT_BONUS)
    expect(board.entries[0].answeredCount).toBe(1)
    expect(board.entries[0].correctCount).toBe(1)
  })

  it('wrong answer scores POINTS_ANSWER only', () => {
    const board = computeScoreboard(
      [MAX],
      [row({ learnerId: MAX.id, answered: true, correct: false })],
      '2026-07-20'
    )

    expect(board.entries[0].points).toBe(POINTS_ANSWER)
    expect(board.entries[0].answeredCount).toBe(1)
    expect(board.entries[0].correctCount).toBe(0)
  })

  it('answered but ungradable (correct null) scores POINTS_ANSWER only', () => {
    const board = computeScoreboard(
      [MAX],
      [row({ learnerId: MAX.id, answered: true, correct: null })],
      '2026-07-20'
    )

    expect(board.entries[0].points).toBe(POINTS_ANSWER)
    expect(board.entries[0].answeredCount).toBe(1)
    expect(board.entries[0].correctCount).toBe(0)
  })

  it('unanswered rows score 0 and do not count as answered', () => {
    const board = computeScoreboard(
      [MAX],
      [row({ learnerId: MAX.id, answered: false, correct: null })],
      '2026-07-20'
    )

    expect(board.entries[0].points).toBe(0)
    expect(board.entries[0].answeredCount).toBe(0)
    expect(board.entries[0].correctCount).toBe(0)
  })

  it('includes the week bounds: Monday and Sunday both count', () => {
    const board = computeScoreboard(
      [MAX],
      [
        row({ learnerId: MAX.id, deliveryDate: '2026-07-20' }), // Monday
        row({ learnerId: MAX.id, deliveryDate: '2026-07-26' }), // Sunday
      ],
      '2026-07-20'
    )

    expect(board.entries[0].answeredCount).toBe(2)
    expect(board.entries[0].points).toBe(2 * (POINTS_ANSWER + POINTS_CORRECT_BONUS))
  })

  it('excludes rows before the week and after it', () => {
    const board = computeScoreboard(
      [MAX],
      [
        row({ learnerId: MAX.id, deliveryDate: '2026-07-19' }), // Sunday before
        row({ learnerId: MAX.id, deliveryDate: '2026-07-27' }), // Monday after
      ],
      '2026-07-20'
    )

    expect(board.entries[0].points).toBe(0)
    expect(board.entries[0].answeredCount).toBe(0)
  })

  it('ignores rows whose learnerId is not in learners', () => {
    const board = computeScoreboard(
      [MAX],
      [row({ learnerId: 'learner-stranger' })],
      '2026-07-20'
    )

    expect(board.entries).toHaveLength(1)
    expect(board.entries[0].learnerId).toBe(MAX.id)
    expect(board.entries[0].points).toBe(0)
  })

  it('the higher-scoring learner leads and sorts first', () => {
    const board = computeScoreboard(
      [MAX, NICO],
      [
        row({ learnerId: NICO.id, correct: true }),
        row({ learnerId: NICO.id, deliveryDate: '2026-07-21', correct: false }),
        row({ learnerId: MAX.id, correct: false }),
      ],
      '2026-07-20'
    )

    expect(board.entries.map((e) => e.learnerId)).toEqual([NICO.id, MAX.id])
    expect(board.leaderId).toBe(NICO.id)
  })

  it('a points tie between the top two yields leaderId null', () => {
    const board = computeScoreboard(
      [MAX, NICO],
      [
        row({ learnerId: MAX.id, correct: true }),
        row({ learnerId: NICO.id, correct: true }),
      ],
      '2026-07-20'
    )

    expect(board.leaderId).toBeNull()
  })

  it('a single learner with points leads outright', () => {
    const board = computeScoreboard([MAX], [row({ learnerId: MAX.id })], '2026-07-20')
    expect(board.leaderId).toBe(MAX.id)
  })

  it('ties order by name asc, then learnerId asc', () => {
    const a = { id: 'learner-b', name: 'Alpha' }
    const b = { id: 'learner-a', name: 'Alpha' }
    const c = { id: 'learner-c', name: 'Beta' }
    const board = computeScoreboard([c, a, b], [], '2026-07-20')

    expect(board.entries.map((e) => e.learnerId)).toEqual(['learner-a', 'learner-b', 'learner-c'])
  })

  it('same input yields the same entry order regardless of learner order', () => {
    const rows = [row({ learnerId: MAX.id }), row({ learnerId: NICO.id })]
    const one = computeScoreboard([MAX, NICO], rows, '2026-07-20')
    const two = computeScoreboard([NICO, MAX], rows, '2026-07-20')

    expect(one.entries).toEqual(two.entries)
  })
})

describe('endOfWeek', () => {
  it('returns the Sunday six days after the Monday', () => {
    expect(endOfWeek('2026-07-20')).toBe('2026-07-26')
  })
  it('crosses a month boundary', () => {
    expect(endOfWeek('2026-07-27')).toBe('2026-08-02')
  })
})
