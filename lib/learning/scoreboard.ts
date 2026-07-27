/**
 * Weekly two-learner scoreboard.
 *
 * Pure: no DB, no SDK, no `new Date()` without an argument. Days are
 * 'YYYY-MM-DD' strings on the learner's local calendar; all date math is
 * Date.UTC arithmetic on those strings, so no timezone ever leaks in.
 * Ties break on name then learnerId, so the result is stable regardless of
 * input order.
 */

export const POINTS_ANSWER = 2
export const POINTS_CORRECT_BONUS = 1

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_DAYS = 7

export interface WeekOutcomeRow {
  learnerId: string
  deliveryDate: string // 'YYYY-MM-DD', learner-local calendar day
  answered: boolean
  correct: boolean | null // null when unanswered or not gradable
}

export interface ScoreEntry {
  learnerId: string
  name: string
  points: number
  answeredCount: number
  correctCount: number
}

export interface Scoreboard {
  weekStart: string // 'YYYY-MM-DD', a Monday
  entries: ScoreEntry[] // sorted points desc, ties broken by name asc then learnerId asc
  leaderId: string | null // null when top two are tied on points (or no entries)
}

function toUtcMs(localDay: string): number {
  const [year, month, day] = localDay.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function toDayString(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10)
}

/** Monday of the week containing localDay ('YYYY-MM-DD'). Pure calendar math — no timezones involved. */
export function startOfWeek(localDay: string): string {
  const ms = toUtcMs(localDay)
  // getUTCDay: 0 = Sunday … 6 = Saturday. Monday-start: Sunday maps back 6 days.
  const dow = new Date(ms).getUTCDay()
  const daysSinceMonday = (dow + 6) % 7
  return toDayString(ms - daysSinceMonday * DAY_MS)
}

/** Sunday closing the week that starts at weekStart (a Monday). */
export function endOfWeek(weekStart: string): string {
  return toDayString(toUtcMs(weekStart) + (WEEK_DAYS - 1) * DAY_MS)
}

export function computeScoreboard(
  learners: ReadonlyArray<{ id: string; name: string }>,
  rows: ReadonlyArray<WeekOutcomeRow>,
  weekStart: string
): Scoreboard {
  const startMs = toUtcMs(weekStart)
  const endMs = startMs + (WEEK_DAYS - 1) * DAY_MS

  const byLearner = new Map<string, ScoreEntry>(
    learners.map((l) => [
      l.id,
      { learnerId: l.id, name: l.name, points: 0, answeredCount: 0, correctCount: 0 },
    ])
  )

  for (const r of rows) {
    const entry = byLearner.get(r.learnerId)
    if (entry === undefined) continue

    const dayMs = toUtcMs(r.deliveryDate)
    if (dayMs < startMs || dayMs > endMs) continue

    if (!r.answered) continue
    entry.answeredCount += 1
    entry.points += POINTS_ANSWER
    if (r.correct === true) {
      entry.correctCount += 1
      entry.points += POINTS_CORRECT_BONUS
    }
  }

  const entries = [...byLearner.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const byName = a.name.localeCompare(b.name)
    return byName !== 0 ? byName : a.learnerId.localeCompare(b.learnerId)
  })

  const leaderId =
    entries.length > 0 && (entries.length === 1 || entries[0].points !== entries[1].points)
      ? entries[0].learnerId
      : null

  return { weekStart, entries, leaderId }
}
