import { afterEach, describe, expect, it, vi } from 'vitest'
import { bearerToken, isCron, secretsEqual } from './auth'

function reqWithAuth(header: string | null): Request {
  const headers = new Headers()
  if (header !== null) headers.set('authorization', header)
  return new Request('https://example.com', { headers })
}

describe('bearerToken', () => {
  it('extracts the token from a well-formed header', () => {
    expect(bearerToken(reqWithAuth('Bearer abc123'))).toBe('abc123')
  })

  it('is case-insensitive on the Bearer scheme', () => {
    expect(bearerToken(reqWithAuth('bearer abc123'))).toBe('abc123')
    expect(bearerToken(reqWithAuth('BEARER abc123'))).toBe('abc123')
  })

  it('returns null when the header is absent', () => {
    expect(bearerToken(reqWithAuth(null))).toBeNull()
  })

  it('returns null for a malformed scheme', () => {
    expect(bearerToken(reqWithAuth('Bearer'))).toBeNull()
    expect(bearerToken(reqWithAuth('Basic xyz'))).toBeNull()
    expect(bearerToken(reqWithAuth('xyz'))).toBeNull()
  })
})

describe('secretsEqual', () => {
  it('is true for equal secrets', () => {
    expect(secretsEqual('a', 'a')).toBe(true)
  })

  it('is false for different secrets', () => {
    expect(secretsEqual('a', 'b')).toBe(false)
  })

  it('does not throw when lengths differ', () => {
    expect(() => secretsEqual('short', 'a-much-longer-secret-value')).not.toThrow()
    expect(secretsEqual('short', 'a-much-longer-secret-value')).toBe(false)
  })
})

describe('isCron', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true for a valid token matching CRON_SECRET', () => {
    vi.stubEnv('CRON_SECRET', 'super-secret')
    expect(isCron(reqWithAuth('Bearer super-secret'))).toBe(true)
  })

  it('returns false for a wrong token', () => {
    vi.stubEnv('CRON_SECRET', 'super-secret')
    expect(isCron(reqWithAuth('Bearer wrong-token'))).toBe(false)
  })

  it('returns false when the header is missing', () => {
    vi.stubEnv('CRON_SECRET', 'super-secret')
    expect(isCron(reqWithAuth(null))).toBe(false)
  })

  it('fails closed when CRON_SECRET is unset, even with a plausible token', () => {
    vi.stubEnv('CRON_SECRET', undefined)
    expect(isCron(reqWithAuth('Bearer super-secret'))).toBe(false)
  })

  it('fails closed when CRON_SECRET is an empty string', () => {
    vi.stubEnv('CRON_SECRET', '')
    expect(isCron(reqWithAuth('Bearer '))).toBe(false)
    expect(isCron(reqWithAuth('Bearer anything'))).toBe(false)
  })

  it('returns false for a malformed header', () => {
    vi.stubEnv('CRON_SECRET', 'super-secret')
    expect(isCron(reqWithAuth('Basic xyz'))).toBe(false)
  })
})
