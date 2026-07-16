import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type Db = PostgresJsDatabase<typeof schema>

let cached: Db | undefined

/**
 * Lazy so `next build` never needs a live DATABASE_URL.
 */
export function getDb(): Db {
  if (!cached) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL is not set')
    }
    // prepare: false — Neon's pooled endpoint runs PgBouncer in transaction
    // mode, which doesn't support prepared statements.
    const client = postgres(url, { prepare: false })
    cached = drizzle(client, { schema })
  }
  return cached
}
