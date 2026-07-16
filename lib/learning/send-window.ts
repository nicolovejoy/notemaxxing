/**
 * DST-safe local send window.
 *
 * Pure: no DB, no SDK, no `new Date()`. `nowUtc` is always a parameter.
 *
 * Vercel Cron is UTC-only and does not adjust for DST. Rather than maintain
 * two seasonal cron expressions, the cron fires every 15 minutes and this
 * module gates delivery against the learner's local clock hour, computed via
 * Intl.DateTimeFormat (IANA tz-aware) from the UTC instant.
 */

export function localDayAndHour(
  nowUtc: Date,
  timeZone: string
): { day: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(nowUtc)

  const get = (type: string) => parts.find((p) => p.type === type)!.value

  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  }
}

export function shouldSendNow(args: {
  nowUtc: Date
  timeZone: string
  targetHourLocal: number
  alreadySentToday: boolean
  pausedUntil?: Date | null
}): boolean {
  const { nowUtc, timeZone, targetHourLocal, alreadySentToday, pausedUntil } = args

  if (pausedUntil != null && nowUtc.getTime() < pausedUntil.getTime()) {
    return false
  }

  if (alreadySentToday) {
    return false
  }

  const { hour } = localDayAndHour(nowUtc, timeZone)
  return hour === targetHourLocal
}
