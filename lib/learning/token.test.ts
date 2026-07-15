import { describe, expect, it } from 'vitest'
import { signToken, verifyToken } from './token'
import type { TokenPayload } from './types'

const SECRET = 'test-secret-do-not-use-in-prod'
const NOW = new Date('2026-07-14T12:00:00Z')

function payload(overrides: Partial<TokenPayload> = {}): TokenPayload {
  return {
    deliveryId: 'delivery-123',
    exp: Math.floor(NOW.getTime() / 1000) + 3600,
    ...overrides,
  }
}

describe('signToken / verifyToken', () => {
  it('round-trips: sign then verify succeeds with the original payload', () => {
    const p = payload()
    const token = signToken(p, SECRET)
    const result = verifyToken(token, SECRET, NOW)

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.payload).toEqual(p)
    }
  })

  it('rejects a token with a tampered payload segment', () => {
    const token = signToken(payload(), SECRET)
    const [payloadSeg, sigSeg] = token.split('.')

    // Flip a character in the payload segment while keeping it valid base64url.
    const flipped = flipChar(payloadSeg)
    const tampered = `${flipped}.${sigSeg}`

    const result = verifyToken(tampered, SECRET, NOW)
    expect(result).toEqual({ valid: false, reason: 'bad_signature' })
  })

  it('rejects a token with a tampered signature segment', () => {
    const token = signToken(payload(), SECRET)
    const [payloadSeg, sigSeg] = token.split('.')

    const flipped = flipChar(sigSeg)
    const tampered = `${payloadSeg}.${flipped}`

    const result = verifyToken(tampered, SECRET, NOW)
    expect(result).toEqual({ valid: false, reason: 'bad_signature' })
  })

  it('rejects a valid token verified with the wrong secret', () => {
    const token = signToken(payload(), SECRET)
    const result = verifyToken(token, 'a-completely-different-secret', NOW)
    expect(result).toEqual({ valid: false, reason: 'bad_signature' })
  })

  it('rejects an expired token', () => {
    const p = payload({ exp: Math.floor(NOW.getTime() / 1000) - 1 })
    const token = signToken(p, SECRET)
    const result = verifyToken(token, SECRET, NOW)
    expect(result).toEqual({ valid: false, reason: 'expired' })
  })

  it('treats exp exactly equal to now as expired (exp <= now is expired, not exp < now)', () => {
    const p = payload({ exp: Math.floor(NOW.getTime() / 1000) })
    const token = signToken(p, SECRET)
    const result = verifyToken(token, SECRET, NOW)
    expect(result).toEqual({ valid: false, reason: 'expired' })
  })

  it('accepts a token that expires one second after now', () => {
    const p = payload({ exp: Math.floor(NOW.getTime() / 1000) + 1 })
    const token = signToken(p, SECRET)
    const result = verifyToken(token, SECRET, NOW)
    expect(result.valid).toBe(true)
  })

  describe('malformed input', () => {
    it('rejects an empty string', () => {
      expect(verifyToken('', SECRET, NOW)).toEqual({ valid: false, reason: 'malformed' })
    })

    it('rejects a string with no dot separator', () => {
      expect(verifyToken('not-a-token-at-all', SECRET, NOW)).toEqual({
        valid: false,
        reason: 'malformed',
      })
    })

    it('rejects non-base64 content in the payload segment', () => {
      expect(verifyToken('not!!valid$$base64.abcdef', SECRET, NOW)).toEqual({
        valid: false,
        reason: 'malformed',
      })
    })

    it('rejects valid base64 that decodes to non-JSON', () => {
      const notJson = base64url(Buffer.from('this is not json {{{'))
      expect(verifyToken(`${notJson}.abcdef`, SECRET, NOW)).toEqual({
        valid: false,
        reason: 'malformed',
      })
    })

    it('rejects JSON missing deliveryId', () => {
      const badPayload = base64url(Buffer.from(JSON.stringify({ exp: 9999999999 })))
      expect(verifyToken(`${badPayload}.abcdef`, SECRET, NOW)).toEqual({
        valid: false,
        reason: 'malformed',
      })
    })

    it('rejects JSON with exp as a string instead of a number', () => {
      const badPayload = base64url(
        Buffer.from(JSON.stringify({ deliveryId: 'd1', exp: '9999999999' }))
      )
      expect(verifyToken(`${badPayload}.abcdef`, SECRET, NOW)).toEqual({
        valid: false,
        reason: 'malformed',
      })
    })
  })

  it('does not throw on a forged token whose signature has the wrong length', () => {
    const token = signToken(payload(), SECRET)
    const [payloadSeg] = token.split('.')
    const shortSig = base64url(Buffer.from('short'))

    expect(() => verifyToken(`${payloadSeg}.${shortSig}`, SECRET, NOW)).not.toThrow()
    const result = verifyToken(`${payloadSeg}.${shortSig}`, SECRET, NOW)
    expect(result).toEqual({ valid: false, reason: 'bad_signature' })
  })

  it('is deterministic: signing the same payload twice with the same secret gives the same token', () => {
    const p = payload()
    const token1 = signToken(p, SECRET)
    const token2 = signToken(p, SECRET)
    expect(token1).toBe(token2)
  })

  it('produces a different signature for a different deliveryId', () => {
    const tokenA = signToken(payload({ deliveryId: 'delivery-a' }), SECRET)
    const tokenB = signToken(payload({ deliveryId: 'delivery-b' }), SECRET)

    const sigA = tokenA.split('.')[1]
    const sigB = tokenB.split('.')[1]
    expect(sigA).not.toBe(sigB)
  })
})

function flipChar(segment: string): string {
  // Base64url alphabet: A-Z a-z 0-9 - _
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const chars = segment.split('')
  const idx = Math.floor(chars.length / 2)
  const current = chars[idx]
  const replacement = alphabet[(alphabet.indexOf(current) + 1) % alphabet.length]
  chars[idx] = replacement
  return chars.join('')
}

function base64url(buf: Buffer): string {
  return buf.toString('base64url')
}
