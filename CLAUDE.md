# Claude Guidelines — Notemaxxing

## What this is

A **Daily Learning Companion** for Max (sophomore neuroscience, SCU). One short
prompt by email each morning → he answers on a lightweight web page → the system
tracks which concepts he engages with and reinforces the weak or interesting ones.

Two prompt kinds:

- **quiz** — a single MCQ, tagged to one concept
- **adventure** — an applied-reasoning scenario tagged to several concepts, which
  opens into a live multi-turn chat with Claude

Repurposed from the old Notemaxxing notes app (Max's idea, 2025). The notes app,
Firebase, and Firestore were removed 2026-07-14; only the design system, brand
tokens, and layout shell survive.

## Critical Rules

### Database — Neon Postgres, Drizzle

- Schema: `lib/db/schema.ts`. Migrations: `drizzle/` (generated, checked in).
- Prod client: `getDb()` in `lib/db/index.ts` — lazy, so `next build` needs no
  live `DATABASE_URL`. `prepare: false` because Neon's pooled endpoint runs
  PgBouncer in transaction mode.
- Migrations need `DATABASE_URL_UNPOOLED` (direct) — PgBouncer doesn't support
  the session locks drizzle-kit uses.
- Columns are snake_case in SQL, camelCase in Drizzle.
- **No `users` table** — single learner by design. Identity for the daily loop
  comes from the signed link, not a session.

### The purity boundary — `lib/learning/**`

Everything under `lib/learning/` is **pure**: `now` is always a parameter, and
nothing may import a DB client, an SDK, or anything from `node:` except `crypto`.
This is what makes the core testable with zero I/O. Do not breach it — put
anything that touches the world in a route or a handler that takes the pure
function's output.

### Auth — signed links, no login

- The daily email carries an HMAC token (`lib/learning/token.ts`). Max clicks
  from his inbox straight to the answer page. **No login** — a login wall every
  morning kills the premise.
- The dashboard uses the same primitive as a magic link.
- Signature is verified **before** expiry, and compared in constant time.

### Thin route → pure function

Route handlers are 2–5 lines: check auth, call a testable function, return.
All logic lives in the function, which is tested against PGlite with fakes
injected. Pattern lifted from `~/src/garm`.

## Testing — TDD is the rule here

- `npm test` — Vitest, runs **fully offline**, no credentials, no network, no
  Docker. PGlite gives real in-process Postgres with the actual `./drizzle`
  migrations applied, so tests exercise the SQL that ships to Neon.
- Write the test first. The selection algorithm is the product; if it's right,
  the product is right.
- Fakes, not mocks, at the seams: inject a `SendFn` for Resend, a canned
  async-iterable for Anthropic streaming.
- Deliberately untested: Tailwind/visual detail, Resend deliverability, Vercel
  cron reliability, the Anthropic SDK's own behavior.

## Coding Standards

1. Plan approach with user before coding
2. TypeScript — proper types, avoid `any`
3. Must pass `npm test`, `npm run type-check`, `npm run lint`, `npm run build`
4. `npx drizzle-kit generate` after any `schema.ts` change — CI fails on drift

## Commands

- `npm test` / `npm run test:watch` — offline, no creds
- `npm run db:generate` — new migration from schema.ts
- `npm run db:migrate` — apply to Neon. **Explicit and manual**, never a deploy
  side effect.
- `npm run db:studio`

## Current State

- **Build**: passing. **Tests**: 129 passing, ~4s.
- **Done**: M0 (test harness + schema + CI), M1 (pure core).
- **Stack**: Next 15.5.20, Drizzle 0.45.2, PGlite 0.5.4, Vitest 4.1.10, zod 4.
- **Brand**: Navy (#1A3C6B) / cream (#F8F8F0) / slate (#4A6E91), Montserrat
  headings, Open Sans body, book+arrow logo. Tokens in `app/globals.css`.
- **Not yet provisioned**: Neon project, Resend sending domain, env vars.

### Locked decisions

- Simplified **SM-2**, not FSRS — one learner never generates enough data to fit
  FSRS's parameters, and SM-2 has published reference values to test against.
- Selection blends due/engagement/coverage additively; an item scores at the
  **max** of its tagged concepts, not the average.
- **"Flagged, not dropped"**: a skipped concept's engagement is raised to a floor
  (0.6) — not a bonus, not a filter. Real urgency still outranks it. Nothing
  filters on `flaggedAt`.
- Weights are due-dominant (0.5 vs 0.3): "show more of what he engages with"
  fights spaced repetition on material he already knows. Tune after real data.
- `noveltyPenalty` (0.25) **must stay below** `due` (0.5), or it silently becomes
  an exclusion rather than a penalty. Regression test pins this.
- Cron runs every 15 min on UTC; `shouldSendNow` gates on local time. Vercel Cron
  is UTC-only and DST-blind — this sidesteps it rather than maintaining two
  seasonal cron expressions.
- **Garm** (`~/src/garm`) was evaluated and deliberately not consumed: it's
  authorization, we need authentication, and two users need neither. Its stack
  was copied instead. Revisit at M6 if the dashboard grows.

## Next Steps

1. **M2** — Drizzle query layer + content import endpoint (API-key auth, but use
   a constant-time compare; the old `/api/import` used `===`).
2. **M3** — Resend + cron. Email template as a pure render function; `SendFn`
   seam. Idempotent insert on `deliveries.delivery_date` before sending — Vercel
   cron double-fires.
3. **M4** — `/learn/r/[token]` answer page + scoring.
4. **M5** — live adventure chat (SSE, turn cap, LLM-as-judge grading).
5. **M6** — dashboard + landing page.

### Known / deferred

- `next lint` is deprecated and goes away in Next 16 — migrate to the ESLint CLI.
- Remaining audit noise: 3 moderate, all one `postcss` cascade.
- `@vercel/analytics` was added 2026-07-05, after the mothball. Still wired in
  `app/layout.tsx` — unresolved whether it stays (cf. the "measurement
  minimalism" bulletin).
- Garm's own cron→Resend pipeline was unverified as of 2026-07-14. We build the
  same path at M3; if it breaks the same way, that's a shared cause.

<!-- SHARED-CONVENTIONS:BEGIN v=d5e16e653242 — auto-managed, do not edit here; source: prompt-lab/workflow/claude-md-shared.md (edit + re-sync) -->

## Shared conventions

<!-- These are Nico's cross-repo output rules. They're materialized into each repo's
CLAUDE.md so every agent (local, cloud, third-party) sees them as plain text. Source
of truth: prompt-lab/workflow/claude-md-shared.md — edit there and re-sync, never here. -->

- **Clickable URLs.** When pointing at any web destination (dashboard, repo, PR, deploy, settings, docs, localhost), print the full bare URL — `https://example.com` or `http://localhost:8080` — on its own, never just the page's name and never a markdown `[label](url)` link. Nico's terminal auto-linkifies raw `https://` text, so a bare URL is one-click and stays copyable.

- **Number your questions.** Any time you ask Nico more than one question, present them as a numbered list (1., 2., 3.) so he can answer by number with no ambiguity. A single standalone question needs no number.

- **Self-contained smoke-test instructions.** When you ask Nico to manually test or verify an app or website, assume zero carried-over context — he should never scroll back or recall a URL/path/credential from earlier. Always include: the exact URL (full `https://…` or `http://localhost:…`, restated even if mentioned above), the precise steps in order, and what a pass vs. fail looks like. Repetition here is a feature, not clutter.

- **No marker before a copy-paste command block.** Nico's terminal renders markdown bullets (`-`, `*`, `•`) as `●`, which breaks paste into zsh. The line directly above a fenced command block must be a plain-text label ending in a colon — never a bullet, dash, asterisk, or number. For loud copy targets, lead the label with `📋` + bold `COPY THE BELOW`, then a colon, then the block.
<!-- SHARED-CONVENTIONS:END -->
