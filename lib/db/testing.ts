import { PGlite } from '@electric-sql/pglite'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from './schema'

export type TestDb = PgliteDatabase<typeof schema>

/**
 * A throwaway in-process Postgres with the real migrations applied. Tests run
 * the exact SQL that ships to Neon — no mocks, no Docker, no network — so they
 * pass identically in CI. Each call is a fresh, isolated database.
 *
 * Dev-only: imports @electric-sql/pglite (a devDependency) and must never be
 * imported by app or route code, or `next build` would try to bundle it.
 */
export async function makeTestDb(): Promise<{
  db: TestDb
  close: () => Promise<void>
}> {
  const client = new PGlite()
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: './drizzle' })
  return { db, close: () => client.close() }
}
