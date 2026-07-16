/**
 * Import an authored content batch into the database.
 *
 *   npm run import -- content/neuro-2026-07.json
 *
 * Reads DATABASE_URL from .env.local (point it at the Neon dev branch for
 * testing; at prod only when you mean it). Validates before writing — a bad
 * batch fails here with line-item errors and touches nothing.
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { getDb } from '../lib/db'
import { parseBatch } from '../lib/content/schema'
import { importBatch } from '../lib/handlers/import-content'

config({ path: '.env.local' })

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('usage: npm run import -- <path-to-batch.json>')
    process.exit(1)
  }

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    console.error(`✗ could not read/parse ${file}: ${(e as Error).message}`)
    process.exit(1)
  }

  const parsed = parseBatch(raw)
  if (!parsed.ok) {
    console.error(`✗ ${file} failed validation:`)
    for (const err of parsed.errors) console.error(`  - ${err}`)
    process.exit(1)
  }

  const summary = await importBatch(getDb(), parsed.batch, new Date())
  console.log(
    `✓ imported "${summary.batchId}": ${summary.conceptsUpserted} concepts, ${summary.itemsUpserted} items`
  )
  // The postgres client holds the pool open; nothing left to do, so exit.
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
