import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeFakeSender, sendViaResend, type OutboundEmail } from './sender'

const email: OutboundEmail = {
  from: 'notemaxxing@example.com',
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello</p>',
  text: 'Hello',
}

describe('sendViaResend', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('posts to Resend with the expected URL, method, auth header, and body', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'msg-1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendViaResend(email)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect(init.headers.authorization).toBe('Bearer test-key')
    expect(JSON.parse(init.body)).toEqual(email)
  })

  it('returns ok with messageId on a 2xx response', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'msg-1' }), { status: 200 }))
    )

    const result = await sendViaResend(email)

    expect(result).toEqual({ ok: true, messageId: 'msg-1', error: null })
  })

  it('returns ok:false with a descriptive error on a non-2xx response, without throwing', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"message":"invalid to address"}', { status: 422 }))
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const outcome = await sendViaResend(email)
    expect(outcome.ok).toBe(false)
    expect(outcome.messageId).toBeNull()
    expect(outcome.error).toContain('422')
    expect(outcome.error).toContain('invalid to address')
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('returns ok:false without throwing when fetch rejects (network error)', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await sendViaResend(email)

    expect(result.ok).toBe(false)
    expect(result.messageId).toBeNull()
    expect(result.error).toBeTruthy()
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('returns ok:false without attempting a fetch when RESEND_API_KEY is unset', async () => {
    vi.stubEnv('RESEND_API_KEY', undefined)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendViaResend(email)

    expect(result.ok).toBe(false)
    expect(result.messageId).toBeNull()
    expect(result.error).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('makeFakeSender', () => {
  it('records sent emails in order and returns incrementing message ids', async () => {
    const { send, sent } = makeFakeSender()

    const first = await send(email)
    const second = await send({ ...email, subject: 'Second' })

    expect(sent).toEqual([email, { ...email, subject: 'Second' }])
    expect(first).toEqual({ ok: true, messageId: 'fake-1', error: null })
    expect(second).toEqual({ ok: true, messageId: 'fake-2', error: null })
  })
})
