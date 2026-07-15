/**
 * Bearer-token primitives for Vercel Cron auth.
 *
 * `secretsEqual` sha256's both sides before comparing so the buffers passed
 * to `timingSafeEqual` are always equal length (32 bytes) — this sidesteps
 * the length-mismatch throw without leaking length via a pre-check.
 */

import { createHash, timingSafeEqual } from 'node:crypto'

/** Extract a bearer token from the Authorization header, or null. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer (.+)$/i.exec(header)
  return match ? match[1] : null
}

/** Constant-time equality for two plaintext secrets. */
export function secretsEqual(a: string, b: string): boolean {
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}

/**
 * True iff the request carries the cron secret. Fails closed: if
 * CRON_SECRET is unset (or empty), no request is ever treated as the cron
 * caller. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * automatically once the env var is set on the project.
 */
export function isCron(req: Request): boolean {
  const token = bearerToken(req)
  const expected = process.env.CRON_SECRET
  if (!token || !expected) return false
  return secretsEqual(token, expected)
}
