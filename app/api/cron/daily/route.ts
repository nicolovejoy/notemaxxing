import { getDb } from '@/lib/db'
import { isCron } from '@/lib/http/auth'
import { sendViaResend } from '@/lib/email/sender'
import { runDailySend } from '@/lib/handlers/daily-send'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_FROM = 'Notemaxxing <daily@send.notemaxxing.net>'

/**
 * Fires every 15 minutes (see vercel.json). runDailySend gates each learner on
 * their own local send hour, which is how a UTC-only, DST-blind cron still lands
 * at 7am Pacific year-round.
 *
 * ?force=1 skips the hour gate — still requires CRON_SECRET. For smoke tests.
 */
export async function GET(req: Request): Promise<Response> {
  if (!isCron(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secret = process.env.LEARN_TOKEN_SECRET
  if (!secret) {
    return Response.json({ error: 'LEARN_TOKEN_SECRET is not set' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://notemaxxing.net'
  const force = new URL(req.url).searchParams.get('force') === '1'

  const result = await runDailySend(getDb(), {
    now: new Date(),
    send: sendViaResend,
    tokenSecret: secret,
    baseUrl,
    from: process.env.LEARN_EMAIL_FROM ?? DEFAULT_FROM,
    force,
  })

  return Response.json(result)
}
