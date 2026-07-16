# Project Scripts

- **`generate-build-info.js`** — writes a build timestamp. Load-bearing: `npm run
build` invokes it before `next build`.
- **`import-content.ts`** — imports an authored content batch. Run via
  `npm run import -- content/<batch>.json`. Validates against
  `lib/content/schema.ts` before writing anything, then upserts idempotently on
  `external_id`, so re-running an edited batch updates in place rather than
  duplicating. Reads `DATABASE_URL` from `.env.local`; pass one inline to target
  a different Neon branch — an inline var wins, since dotenv does not override
  what is already set.

Content is git JSON imported by a script the author runs — deliberately not an
endpoint. See CLAUDE.md.
