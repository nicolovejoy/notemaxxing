import { describe, expect, it } from 'vitest'
import { localDayAndHour, shouldSendNow } from './send-window'

const LA = 'America/Los_Angeles'

describe('localDayAndHour', () => {
  it('converts a UTC instant to local day/hour/minute (PDT, UTC-7)', () => {
    // 2026-07-14T14:00:00Z is summer -> PDT (UTC-7) -> 07:00 local.
    expect(localDayAndHour(new Date('2026-07-14T14:00:00Z'), LA)).toEqual({
      day: '2026-07-14',
      hour: 7,
      minute: 0,
    })
  })

  it('a UTC instant late in the day is still the previous local day in LA', () => {
    // 2026-07-15T03:00:00Z -> 2026-07-14T20:00 PDT. This is the DST-and-date-line
    // bug this module exists to avoid: naive UTC-date keying would call this
    // 07-15 and let a second email through on local 07-14.
    expect(localDayAndHour(new Date('2026-07-15T03:00:00Z'), LA)).toEqual({
      day: '2026-07-14',
      hour: 20,
      minute: 0,
    })
  })

  it('works for a UTC instant just after local midnight', () => {
    // 2026-01-01T07:30:00Z -> 2025-12-31T23:30 PST (UTC-8).
    expect(localDayAndHour(new Date('2026-01-01T07:30:00Z'), LA)).toEqual({
      day: '2025-12-31',
      hour: 23,
      minute: 30,
    })
  })

  it('is correct for a second timezone (America/New_York), not hardcoded to Pacific', () => {
    // 2026-01-01T12:00:00Z -> 2026-01-01T07:00 EST (UTC-5, winter).
    expect(localDayAndHour(new Date('2026-01-01T12:00:00Z'), 'America/New_York')).toEqual({
      day: '2026-01-01',
      hour: 7,
      minute: 0,
    })
    // 2026-07-01T11:00:00Z -> 2026-07-01T07:00 EDT (UTC-4, summer).
    expect(localDayAndHour(new Date('2026-07-01T11:00:00Z'), 'America/New_York')).toEqual({
      day: '2026-07-01',
      hour: 7,
      minute: 0,
    })
  })

  it('works for the UTC timezone itself (identity mapping)', () => {
    expect(localDayAndHour(new Date('2026-01-01T07:30:00Z'), 'UTC')).toEqual({
      day: '2026-01-01',
      hour: 7,
      minute: 30,
    })
  })

  // --- Spring forward: 2026-03-08, America/Los_Angeles, 2am -> 3am, PST (UTC-8) -> PDT (UTC-7) ---
  describe('spring forward (2026-03-08, PST->PDT)', () => {
    it('the hour before the jump is still PST (UTC-8)', () => {
      // 2026-03-08T09:59:00Z -> 01:59 PST.
      expect(localDayAndHour(new Date('2026-03-08T09:59:00Z'), LA)).toEqual({
        day: '2026-03-08',
        hour: 1,
        minute: 59,
      })
    })

    it('the clock jumps straight from 01:59 to 03:00 (02:00-02:59 does not exist)', () => {
      // 2026-03-08T10:00:00Z is the instant of the jump -> 03:00 PDT, not 02:00.
      expect(localDayAndHour(new Date('2026-03-08T10:00:00Z'), LA)).toEqual({
        day: '2026-03-08',
        hour: 3,
        minute: 0,
      })
    })

    it('7am local on transition day is already PDT (UTC-7), one hour earlier in UTC than the day before', () => {
      // Day before (still PST): 7am local = 15:00Z.
      expect(localDayAndHour(new Date('2026-03-07T15:00:00Z'), LA)).toEqual({
        day: '2026-03-07',
        hour: 7,
        minute: 0,
      })
      // Transition day (now PDT): 7am local = 14:00Z.
      expect(localDayAndHour(new Date('2026-03-08T14:00:00Z'), LA)).toEqual({
        day: '2026-03-08',
        hour: 7,
        minute: 0,
      })
    })
  })

  // --- Fall back: 2026-11-01, America/Los_Angeles, 2am -> 1am, PDT (UTC-7) -> PST (UTC-8) ---
  describe('fall back (2026-11-01, PDT->PST)', () => {
    it('01:xx local occurs twice - first pass is still PDT (UTC-7)', () => {
      // 2026-11-01T08:30:00Z -> 01:30 PDT (first occurrence).
      expect(localDayAndHour(new Date('2026-11-01T08:30:00Z'), LA)).toEqual({
        day: '2026-11-01',
        hour: 1,
        minute: 30,
      })
    })

    it('01:xx local occurs twice - second pass is PST (UTC-8), one hour later in UTC', () => {
      // 2026-11-01T09:30:00Z -> 01:30 PST (second occurrence, same local wall clock).
      expect(localDayAndHour(new Date('2026-11-01T09:30:00Z'), LA)).toEqual({
        day: '2026-11-01',
        hour: 1,
        minute: 30,
      })
    })

    it('7am local on transition day is unaffected: still PST (UTC-8), same offset as the day after', () => {
      // Transition day (now PST): 7am local = 15:00Z.
      expect(localDayAndHour(new Date('2026-11-01T15:00:00Z'), LA)).toEqual({
        day: '2026-11-01',
        hour: 7,
        minute: 0,
      })
      // Day after (still PST): 7am local = 15:00Z, same offset.
      expect(localDayAndHour(new Date('2026-11-02T15:00:00Z'), LA)).toEqual({
        day: '2026-11-02',
        hour: 7,
        minute: 0,
      })
    })
  })
})

describe('shouldSendNow', () => {
  const targetHourLocal = 7

  it('true at exactly the target local hour, not already sent, not paused', () => {
    // 2026-07-14T14:00:00Z -> 07:00 PDT.
    expect(
      shouldSendNow({
        nowUtc: new Date('2026-07-14T14:00:00Z'),
        timeZone: LA,
        targetHourLocal,
        alreadySentToday: false,
      })
    ).toBe(true)
  })

  it('true anywhere within the target hour (cron runs every 15min) - e.g. 07:45 local', () => {
    // 2026-07-14T14:45:00Z -> 07:45 PDT, still hour 7.
    expect(
      shouldSendNow({
        nowUtc: new Date('2026-07-14T14:45:00Z'),
        timeZone: LA,
        targetHourLocal,
        alreadySentToday: false,
      })
    ).toBe(true)
  })

  it('false one minute before the target hour (06:59 local)', () => {
    // 2026-07-14T13:59:00Z -> 06:59 PDT.
    expect(
      shouldSendNow({
        nowUtc: new Date('2026-07-14T13:59:00Z'),
        timeZone: LA,
        targetHourLocal,
        alreadySentToday: false,
      })
    ).toBe(false)
  })

  it('false at the top of the following hour (08:00 local)', () => {
    // 2026-07-14T15:00:00Z -> 08:00 PDT.
    expect(
      shouldSendNow({
        nowUtc: new Date('2026-07-14T15:00:00Z'),
        timeZone: LA,
        targetHourLocal,
        alreadySentToday: false,
      })
    ).toBe(false)
  })

  it('false when already sent today, even exactly at the target hour', () => {
    expect(
      shouldSendNow({
        nowUtc: new Date('2026-07-14T14:00:00Z'),
        timeZone: LA,
        targetHourLocal,
        alreadySentToday: true,
      })
    ).toBe(false)
  })

  it('false when paused until a time in the future, even at the target hour', () => {
    expect(
      shouldSendNow({
        nowUtc: new Date('2026-07-14T14:00:00Z'),
        timeZone: LA,
        targetHourLocal,
        alreadySentToday: false,
        pausedUntil: new Date('2026-07-15T00:00:00Z'),
      })
    ).toBe(false)
  })

  it('true when pausedUntil is in the past (pause has expired), at the target hour', () => {
    expect(
      shouldSendNow({
        nowUtc: new Date('2026-07-14T14:00:00Z'),
        timeZone: LA,
        targetHourLocal,
        alreadySentToday: false,
        pausedUntil: new Date('2026-07-14T00:00:00Z'),
      })
    ).toBe(true)
  })

  it('true when pausedUntil equals nowUtc exactly (>= boundary is inclusive)', () => {
    const nowUtc = new Date('2026-07-14T14:00:00Z')
    expect(
      shouldSendNow({
        nowUtc,
        timeZone: LA,
        targetHourLocal,
        alreadySentToday: false,
        pausedUntil: new Date(nowUtc.getTime()),
      })
    ).toBe(true)
  })

  it('true when pausedUntil is null', () => {
    expect(
      shouldSendNow({
        nowUtc: new Date('2026-07-14T14:00:00Z'),
        timeZone: LA,
        targetHourLocal,
        alreadySentToday: false,
        pausedUntil: null,
      })
    ).toBe(true)
  })

  it('true when pausedUntil is undefined (field omitted)', () => {
    expect(
      shouldSendNow({
        nowUtc: new Date('2026-07-14T14:00:00Z'),
        timeZone: LA,
        targetHourLocal,
        alreadySentToday: false,
      })
    ).toBe(true)
  })

  describe('DST: spring forward (2026-03-08)', () => {
    it('the target-hour window shifts one hour earlier in UTC on the transition day', () => {
      // Day before (PST): 7am local = 15:00Z.
      expect(
        shouldSendNow({
          nowUtc: new Date('2026-03-07T15:00:00Z'),
          timeZone: LA,
          targetHourLocal,
          alreadySentToday: false,
        })
      ).toBe(true)
      // Same UTC clock time the next day is now 8am local (PDT), not 7am.
      expect(
        shouldSendNow({
          nowUtc: new Date('2026-03-08T15:00:00Z'),
          timeZone: LA,
          targetHourLocal,
          alreadySentToday: false,
        })
      ).toBe(false)
      // The new correct UTC instant for 7am local on transition day.
      expect(
        shouldSendNow({
          nowUtc: new Date('2026-03-08T14:00:00Z'),
          timeZone: LA,
          targetHourLocal,
          alreadySentToday: false,
        })
      ).toBe(true)
    })

    it('exactly one target-hour window exists for 2026-03-08 local day (skipped 2am hour does not create a second)', () => {
      const day = '2026-03-08'
      const hits: string[] = []
      // Scan every 15 minutes across the whole UTC day plus a bit of overlap.
      for (let m = 0; m < 27 * 60; m += 15) {
        const nowUtc = new Date(Date.UTC(2026, 2, 7, 12, 0, 0) + m * 60_000)
        const local = localDayAndHour(nowUtc, LA)
        if (
          local.day === day &&
          shouldSendNow({ nowUtc, timeZone: LA, targetHourLocal, alreadySentToday: false })
        ) {
          hits.push(nowUtc.toISOString())
        }
      }
      // 07:00-07:59 local in 15-min steps -> exactly 4 hits, all within one UTC hour.
      expect(hits).toEqual([
        '2026-03-08T14:00:00.000Z',
        '2026-03-08T14:15:00.000Z',
        '2026-03-08T14:30:00.000Z',
        '2026-03-08T14:45:00.000Z',
      ])
    })
  })

  describe('DST: fall back (2026-11-01)', () => {
    it('a 7am target is unaffected by the 1am-occurs-twice ambiguity', () => {
      expect(
        shouldSendNow({
          nowUtc: new Date('2026-11-01T15:00:00Z'),
          timeZone: LA,
          targetHourLocal,
          alreadySentToday: false,
        })
      ).toBe(true)
      // Day after, same offset (PST), same UTC clock time -> still true.
      expect(
        shouldSendNow({
          nowUtc: new Date('2026-11-02T15:00:00Z'),
          timeZone: LA,
          targetHourLocal,
          alreadySentToday: false,
        })
      ).toBe(true)
    })

    it('a 1am target would fire on both UTC occurrences of local 1am (documenting the ambiguity, not "fixing" it)', () => {
      expect(
        shouldSendNow({
          nowUtc: new Date('2026-11-01T08:30:00Z'), // first 01:30 PDT
          timeZone: LA,
          targetHourLocal: 1,
          alreadySentToday: false,
        })
      ).toBe(true)
      expect(
        shouldSendNow({
          nowUtc: new Date('2026-11-01T09:30:00Z'), // second 01:30 PST
          timeZone: LA,
          targetHourLocal: 1,
          alreadySentToday: false,
        })
      ).toBe(true)
    })
  })
})
