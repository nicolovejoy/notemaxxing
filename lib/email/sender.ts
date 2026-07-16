/**
 * Plain fetch to Resend — no SDK, keeps deps at zero. NEVER log the API key.
 * The response body is safe to log on failure (Resend's error payload
 * carries no secrets).
 */

export type OutboundEmail = {
  from: string
  to: string
  subject: string
  html: string
  text: string
}

export type SendResult = {
  ok: boolean
  messageId: string | null
  error: string | null
}

export type SendFn = (email: OutboundEmail) => Promise<SendResult>

export const sendViaResend: SendFn = async (email) => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, messageId: null, error: 'RESEND_API_KEY is not set' }
  }

  let res: Response
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(email),
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`Resend send failed (network error): ${error}`)
    return { ok: false, messageId: null, error }
  }

  const body = await res.text().catch(() => '')

  if (!res.ok) {
    const error = `${res.status}: ${body}`
    console.error(`Resend send failed (${error})`)
    return { ok: false, messageId: null, error }
  }

  let messageId: string | null = null
  try {
    const parsed = JSON.parse(body) as { id?: string }
    messageId = parsed.id ?? null
  } catch {
    messageId = null
  }

  return { ok: true, messageId, error: null }
}

/** In-memory recorder for tests — keeps the suite offline. */
export function makeFakeSender(): { send: SendFn; sent: OutboundEmail[] } {
  const sent: OutboundEmail[] = []
  let count = 0
  const send: SendFn = async (email) => {
    sent.push(email)
    count += 1
    return { ok: true, messageId: `fake-${count}`, error: null }
  }
  return { send, sent }
}
