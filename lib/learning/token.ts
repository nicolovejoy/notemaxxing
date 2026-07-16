/**
 * Stateless HMAC-signed links for the daily learning email.
 *
 * The token IS the auth — there is no token table, no session, no login.
 * Anyone holding a valid token can act as the delivery it names, so every
 * check here must fail closed and every comparison must be constant-time.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { TokenPayload, TokenVerification } from './types'

function base64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function sign(payloadSegment: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payloadSegment).digest()
}

export function signToken(payload: TokenPayload, secret: string): string {
  const payloadSegment = base64url(Buffer.from(JSON.stringify(payload)))
  const signatureSegment = base64url(sign(payloadSegment, secret))
  return `${payloadSegment}.${signatureSegment}`
}

function isTokenPayload(value: unknown): value is TokenPayload {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.deliveryId === 'string' && typeof v.exp === 'number'
}

export function verifyToken(token: string, secret: string, now: Date): TokenVerification {
  const parts = token.split('.')
  if (parts.length !== 2) return { valid: false, reason: 'malformed' }
  const [payloadSegment, signatureSegment] = parts
  if (!payloadSegment || !signatureSegment) return { valid: false, reason: 'malformed' }

  let payloadBuf: Buffer
  let providedSig: Buffer
  try {
    payloadBuf = Buffer.from(payloadSegment, 'base64url')
    providedSig = Buffer.from(signatureSegment, 'base64url')
  } catch {
    return { valid: false, reason: 'malformed' }
  }

  let payload: unknown
  try {
    payload = JSON.parse(payloadBuf.toString('utf8'))
  } catch {
    return { valid: false, reason: 'malformed' }
  }

  if (!isTokenPayload(payload)) return { valid: false, reason: 'malformed' }

  const expectedSig = sign(payloadSegment, secret)

  // timingSafeEqual throws on length mismatch — check length first (not
  // secret-dependent, so this branch leaks nothing useful to an attacker)
  // and treat it the same as a signature mismatch.
  if (providedSig.length !== expectedSig.length) {
    return { valid: false, reason: 'bad_signature' }
  }
  if (!timingSafeEqual(providedSig, expectedSig)) {
    return { valid: false, reason: 'bad_signature' }
  }

  // Signature verified before expiry is checked: a forged/unsigned token
  // must not be able to distinguish "expired" from "wrong secret" etc.
  const nowSeconds = Math.floor(now.getTime() / 1000)
  if (payload.exp <= nowSeconds) {
    return { valid: false, reason: 'expired' }
  }

  return { valid: true, payload }
}
