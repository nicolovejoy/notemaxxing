/**
 * Pure copy formatting for the post-answer teach/motivate block. Kept out of JSX
 * so the wording is unit-tested — the components just render these strings.
 */
import type { ConceptProgress, ScoreboardView } from '@/lib/handlers/respond'

function days(n: number): string {
  const d = Math.round(n)
  return d === 1 ? '1 day' : `${d} days`
}

/** One terse line per concept: mastery level + next review, or a reset nudge. */
export function formatProgress(p: ConceptProgress): string {
  if (p.repetitions === 0) {
    return `${p.name} — back to basics, see it again soon`
  }
  return `${p.name} — level ${p.repetitions} · next review in ${days(p.intervalDays)}`
}

/** Self-relative weekly standings, e.g. "This week: You 8 · Nico 6 — you lead." */
export function formatScoreboard(s: ScoreboardView): string {
  const parts = s.entries.map((e) => `${e.self ? 'You' : e.name} ${e.points}`)
  const selfName = s.entries.find((e) => e.self)?.name
  const tail =
    s.leaderName === null
      ? 'tied'
      : s.leaderName === selfName
        ? 'you lead'
        : `${s.leaderName} leads`
  return `This week: ${parts.join(' · ')} — ${tail}.`
}
