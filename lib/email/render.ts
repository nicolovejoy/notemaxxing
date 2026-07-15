/**
 * The daily email. Pure: data in, {subject, html, text} out — no clock, no
 * randomness, no I/O.
 *
 * The email teases; it never answers. Options, the correct index, the
 * explanation, and the grading rubric all stay on the page — partly because
 * answering in the inbox isn't the design, and partly because anything in here
 * is one forward away from being the answer key.
 */

export type RenderableItem = {
  kind: 'quiz' | 'adventure'
  title: string
  /** Opaque authored payload. Fields may be missing — the bank is hand-written. */
  body: Record<string, unknown>
}

export type RenderInput = {
  learnerName: string
  item: RenderableItem
  answerUrl: string
}

export type RenderedEmail = {
  subject: string
  html: string
  text: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/** The one line of authored content the email shows. */
function teaser(item: RenderableItem): string {
  return item.kind === 'quiz'
    ? str(item.body.prompt)
    : str(item.body.opening_scenario)
}

const NAVY = '#1A3C6B'
const CREAM = '#F8F8F0'
const SLATE = '#4A6E91'
const CHARCOAL = '#333333'

export function renderDailyEmail(input: RenderInput): RenderedEmail {
  const { item, answerUrl } = input
  const name = firstName(input.learnerName)
  const isQuiz = item.kind === 'quiz'
  const prompt = teaser(item)

  const subject = isQuiz ? `Today's question: ${item.title}` : `Today's case: ${item.title}`
  const cta = isQuiz ? 'Answer' : 'Start'
  const kicker = isQuiz ? 'One question' : 'A situation'

  const text = [
    `${name},`,
    '',
    prompt || item.title,
    '',
    `${cta}: ${answerUrl}`,
  ].join('\n')

  // Inline styles and a table shell — email clients strip <style> and don't do flexbox.
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px;font-family:'Open Sans',Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding-bottom:24px;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${SLATE};">${escapeHtml(kicker)}</div>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <div style="font-size:20px;line-height:1.5;color:${CHARCOAL};">${escapeHtml(prompt || item.title)}</div>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <a href="${escapeHtml(answerUrl)}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;">${escapeHtml(cta)}</a>
      </td></tr>
      <tr><td style="border-top:1px solid #e2e2d8;padding-top:16px;">
        <div style="font-size:12px;color:${SLATE};">Notemaxxing &middot; ${escapeHtml(name)}'s daily</div>
      </td></tr>
    </table>
  </td></tr>
</table>`

  return { subject, html, text }
}
