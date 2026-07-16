/**
 * One-off prod cutover for the ochem bank. Delete after use.
 *
 *   npx tsx scripts/prod-cutover.ts inventory   # read-only, safe
 *   npx tsx scripts/prod-cutover.ts clear       # destructive
 *   npx tsx scripts/prod-cutover.ts golive      # flips Max on
 *
 * Takes DATABASE_URL from the environment ONLY — it deliberately does not read
 * .env.local, so there is no chance of silently hitting dev when you meant prod
 * (or vice versa). Pass it explicitly:
 *
 *   DATABASE_URL="$(neonctl connection-string main --project-id misty-flower-84487821 --pooled)" \
 *     npx tsx scripts/prod-cutover.ts inventory
 *
 * Order matters: clear BEFORE the 0002 migration, so no row ever exists with a
 * NULL external_id (those are un-updatable by import and still emailable).
 */
import postgres from 'postgres'

const MAX_EMAIL = 'lovejoymaximillion@gmail.com'
const SEND_HOUR = 10

async function main() {
  const cmd = process.argv[2]
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('✗ DATABASE_URL not set. Pass it explicitly — see the header of this file.')
    process.exit(1)
  }
  if (!['inventory', 'clear', 'golive'].includes(cmd ?? '')) {
    console.error('usage: prod-cutover.ts <inventory|clear|golive>')
    process.exit(1)
  }

  const sql = postgres(url, { prepare: false })

  const inventory = async () => {
    const [{ n: items }] = await sql`select count(*)::int as n from content_items`
    const [{ n: concepts }] = await sql`select count(*)::int as n from concepts`
    const [{ n: deliveries }] = await sql`select count(*)::int as n from deliveries`
    const [{ n: responses }] = await sql`select count(*)::int as n from responses`
    const hasCol = await sql`
      select column_name from information_schema.columns
      where table_name = 'content_items' and column_name = 'external_id'`
    const learners = await sql`
      select email, timezone, send_hour_local, is_active from learners order by email`

    console.log('content_items:', items, '| concepts:', concepts, '| deliveries:', deliveries, '| responses:', responses)
    console.log('0002 applied (external_id column):', hasCol.length > 0)
    for (const l of learners) {
      console.log(`  ${l.email.padEnd(32)} tz=${l.timezone} hour=${l.send_hour_local} active=${l.is_active}`)
    }
  }

  if (cmd === 'inventory') {
    await inventory()
  }

  if (cmd === 'clear') {
    await sql.begin(async (tx) => {
      const r = await tx`delete from responses`
      const d = await tx`delete from deliveries`
      const c = await tx`delete from content_items`
      const k = await tx`delete from concepts`
      console.log(`deleted — responses:${r.count} deliveries:${d.count} content_items:${c.count} concepts:${k.count}`)
    })
    console.log('--- after ---')
    await inventory()
    console.log('\nNext: apply migration 0002, then import the bank.')
  }

  if (cmd === 'golive') {
    const [{ n: active }] = await sql`
      select count(*)::int as n from content_items where is_active = true`
    if (active === 0) {
      console.error('✗ refusing: no active content_items. Import the bank before flipping Max on.')
      process.exit(1)
    }
    const nulls = await sql`select count(*)::int as n from content_items where external_id is null`
    if (Number(nulls[0].n) > 0) {
      console.error(`✗ refusing: ${nulls[0].n} content_items have a NULL external_id (orphans). Clear them first.`)
      process.exit(1)
    }
    await sql`
      update learners set is_active = true, send_hour_local = ${SEND_HOUR}
      where email = ${MAX_EMAIL}`
    console.log(`✓ Max is live — ${active} active items, send hour ${SEND_HOUR} local.`)
    console.log('--- learners ---')
    await inventory()
  }

  await sql.end()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
