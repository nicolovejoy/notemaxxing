/**
 * iMessage probe — text Max today's learning link from your own Messages app.
 *
 * Why: Max has ignored 5 straight emails (0 opens). This tests whether that's a
 * DELIVERY problem (email lands in spam) or an INTEREST problem, by sending the
 * exact same signed question link over iMessage from Nico's number instead.
 *
 * It does NOT create a delivery or write anything — it reads Max's most recent
 * `sent` delivery from prod and reconstructs the same HMAC link the email held
 * (token TTL is 7 days, so today's link is still valid). If Max clicks it, the
 * answer page records a `link_clicked` event exactly as it would from email —
 * so the existing instrumentation already tells us whether the text worked.
 *
 * Reads (read-only) from whatever DATABASE_URL is set. Max's real rows live on
 * the Neon `main` (prod) branch, and `.env.local` points at `dev` — so you MUST
 * pass prod inline (an inline env var beats dotenv, which won't override it):
 *
 *   DATABASE_URL="$(neonctl connection-string main --project-id misty-flower-84487821 --pooled)" \
 *     node scripts/imessage-probe.mjs            # dry run: prints the link, sends nothing
 *
 *   DATABASE_URL="$(neonctl connection-string main --project-id misty-flower-84487821 --pooled)" \
 *     node scripts/imessage-probe.mjs --send     # actually iMessages Max
 *
 * Needs in .env.local (add yourself — the secrets hook blocks the file tools):
 *   LEARN_TOKEN_SECRET   — same value as Vercel/1Password `notemaxxing-token-secret`
 *   MAX_IMESSAGE_HANDLE  — Max's phone (+1XXXXXXXXXX) or iMessage email
 * Optional:
 *   NEXT_PUBLIC_SITE_URL — defaults to https://notemaxxing.net
 *   PROBE_MESSAGE        — message text; use {url} where the link should go
 */
import { config } from 'dotenv'
import { createHmac } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import postgres from 'postgres'

config({ path: '.env.local' })

const SEND = process.argv.includes('--send')
const ALLOW_DEV = process.argv.includes('--allow-dev')
const MAX_EMAIL = 'lovejoymaximillion@gmail.com'
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://notemaxxing.net').replace(/\/$/, '')
const SCRATCH =
  '/private/tmp/claude-501/-Users-nico-src-notemaxxing/6685ec07-7dfd-4839-8d77-ecf9136d5041/scratchpad'

function die(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// Mirrors lib/learning/token.ts::signToken exactly. Stable shipped auth format.
function signToken(payload, secret) {
  const payloadSegment = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureSegment = createHmac('sha256', secret)
    .update(payloadSegment)
    .digest()
    .toString('base64url')
  return `${payloadSegment}.${signatureSegment}`
}

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) die('DATABASE_URL not set — pass the prod (main) connection string inline. See header.')
const secret = process.env.LEARN_TOKEN_SECRET
if (!secret) die('LEARN_TOKEN_SECRET not set — add it to .env.local from 1Password `notemaxxing-token-secret`.')
const handle = process.env.MAX_IMESSAGE_HANDLE
if (SEND && !handle) die('MAX_IMESSAGE_HANDLE not set — add Max’s phone/iMessage email to .env.local.')

// Guardrail: Max's rows are on prod `main` (ep-wild-river). `dev` is ep-bold-cake.
const host = (() => {
  try {
    return new URL(dbUrl).host
  } catch {
    return dbUrl
  }
})()
if (host.includes('ep-bold-cake') && !ALLOW_DEV) {
  die(`DATABASE_URL points at the Neon dev branch (${host}) — Max has no real deliveries there.\n  Pass the main/prod string inline, or add --allow-dev to override.`)
}

const sql = postgres(dbUrl, { prepare: false })

try {
  const [learner] = await sql`
    select id, name, email, timezone from learners where email = ${MAX_EMAIL} limit 1
  `
  if (!learner) die(`no learner with email ${MAX_EMAIL} in this database (host ${host}).`)

  const [d] = await sql`
    select d.id, d.delivery_date, d.sent_at, d.token_expires_at, c.title, c.kind, c.body
    from deliveries d
    join content_items c on c.id = d.content_item_id
    where d.learner_id = ${learner.id} and d.status = 'sent'
    order by coalesce(d.sent_at, d.created_at) desc
    limit 1
  `
  if (!d) die(`no 'sent' delivery found for ${learner.name}. Has the daily cron run for him yet?`)

  const exp = Math.floor(new Date(d.token_expires_at).getTime() / 1000)
  if (exp <= Math.floor(Date.now() / 1000)) {
    die(`the most recent delivery's token expired (${d.token_expires_at}). Wait for a fresh daily send.`)
  }

  const token = signToken({ deliveryId: d.id, exp }, secret)
  const url = `${SITE}/learn/r/${token}`
  // Lead with the actual question stem (same field the email teases with), then
  // the link. {q} = question, {url} = link. Override wording with PROBE_MESSAGE.
  const body = d.body ?? {}
  const question = (typeof body.prompt === 'string' && body.prompt) ||
    (typeof body.opening_scenario === 'string' && body.opening_scenario) ||
    d.title
  const tmpl = process.env.PROBE_MESSAGE ?? '{q}\n{url}'
  const message = tmpl.replace('{q}', question).replace('{url}', url)

  console.log('')
  console.log(`  db host      : ${host}`)
  console.log(`  learner      : ${learner.name} <${learner.email}>`)
  console.log(`  delivery     : ${d.delivery_date}  (item: "${d.title}", ${d.kind})`)
  console.log(`  token exp    : ${d.token_expires_at}`)
  console.log(`  handle       : ${handle ?? '(unset)'}`)
  console.log('')
  console.log(`  message      : ${message}`)
  console.log(`  link         : ${url}`)
  console.log('')

  if (!SEND) {
    console.log('  DRY RUN — nothing sent. Open the link above yourself to confirm it renders')
    console.log('  the question, then re-run with --send to iMessage Max.')
    process.exit(0)
  }

  // Write the AppleScript to a file so the URL passes as an argv arg (no shell
  // quoting of the message text). Sends via your logged-in iMessage account.
  const scriptPath = `${SCRATCH}/send-imessage.applescript`
  writeFileSync(
    scriptPath,
    [
      'on run {targetHandle, messageText}',
      '\ttell application "Messages"',
      '\t\tset targetService to 1st service whose service type = iMessage',
      '\t\tset targetBuddy to buddy targetHandle of targetService',
      '\t\tsend messageText to targetBuddy',
      '\tend tell',
      'end run',
    ].join('\n')
  )

  try {
    execFileSync('osascript', [scriptPath, handle, message], { stdio: 'inherit' })
    console.log(`  ✓ sent to ${handle}`)
  } catch (e) {
    die(
      `osascript failed: ${e.message}\n` +
        '  First run needs: Messages app open + logged in, and Terminal allowed to control\n' +
        '  Messages (System Settings → Privacy & Security → Automation).'
    )
  }
} finally {
  await sql.end({ timeout: 5 })
}
