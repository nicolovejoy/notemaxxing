import { getDb } from '@/lib/db'
import { recordResponse } from '@/lib/handlers/respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Maps a handler failure to a status. Auth failures are all 401 — a forged,
 *  expired, and unknown token must be indistinguishable from outside. */
const STATUS: Record<string, number> = {
  malformed: 401,
  bad_signature: 401,
  expired: 401,
  not_found: 401,
  bad_choice: 400,
  unsupported_kind: 400,
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.LEARN_TOKEN_SECRET
  if (!secret) return Response.json({ error: 'not configured' }, { status: 500 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const { token, chosenIndex } = (body ?? {}) as { token?: unknown; chosenIndex?: unknown }
  if (typeof token !== 'string' || typeof chosenIndex !== 'number') {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const result = await recordResponse(getDb(), { token, secret, now: new Date(), chosenIndex })

  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: STATUS[result.reason] ?? 400 })
  }
  return Response.json(result)
}
