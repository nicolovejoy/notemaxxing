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

- **Build**: passing. **Tests**: 271 passing, ~35s. Branch:
  `feat/daily-learning-companion`, last commit `a05df58` (local, not pushed).
  PR: https://github.com/nicolovejoy/notemaxxing/pull/new/feat/daily-learning-companion
- **Done**: M0 (harness+schema+CI), M1 (pure core), M2 (query layer),
  M3 (email+Resend+cron), **smoke test** (first real email delivered to Nico via
  Resend 2026-07-15), **M4** (answer page + respond handler), **content import**
  (git JSON → zod → idempotent upsert).
- **⚠️ Max is `is_active=false`** — still. Flip only after the real content bank
  is authored + imported to prod. Re-activate deliberately.
- **⚠️ Migration `0002` (content_items.external_id) is on the Neon `dev` branch
  ONLY, not prod (`main`).** So is the sample content. Apply to prod deliberately
  before Max: `npm run db:migrate` with `.env.local` pointed at prod, then import.
- **M4 shape**: `/learn/r/[token]` (page.tsx + quiz-form.tsx) + `POST
/api/learn/respond` → `lib/handlers/respond.ts`. Idempotent on
  `responses.delivery_id` UNIQUE; response time server-derived from the
  `link_clicked` event (not client-trusted); answer key never in the initial
  page payload. Page is **single-theme** (fixed brand hex, not the OS-reactive
  tokens — those inverted `--brand-charcoal` to near-white over white cards).
- **Content pipeline**: author batches as `content/*.json`, `npm run import --
<file>`. Validated by `lib/content/schema.ts` (zod), upserted by
  `lib/handlers/import-content.ts`. Idempotent via `external_id`. No endpoint, no
  API key — a script the author runs. `content/neuro-sample.json` is the template.
- **Stack**: Next 15.5.20, Drizzle 0.45.2, PGlite 0.5.4, Vitest 4.1.10, zod 4, tsx.
- **Brand**: Navy (#1A3C6B) / cream (#F8F8F0) / slate (#4A6E91), Montserrat
  headings, Open Sans body, book+arrow logo. Tokens in `app/globals.css`.

### Infrastructure (live)

- **Neon**: `neon-charcoal-ocean` (project `misty-flower-84487821`, org
  `org-spring-cherry-36158724`, **aws-us-east-1** — the old "us-west-2" note was
  wrong). `main` = production; `dev` (`br-little-mode-atb8lvjg`) = an isolated
  copy-on-write branch for local/testing, added 2026-07-16. **Learner isolation
  (learner_id) is not environment isolation** — before this, all local testing
  hit prod. Local `.env.local` now points at `dev` (repoint via the scratchpad
  `point-local-at-dev.js` pattern, or `neonctl connection-string dev --pooled`).
  Migrations `0000`+`0001` on both branches; **`0002` on `dev` only**.
  `drizzle-kit migrate` prints nothing on success — verify against
  `drizzle.__drizzle_migrations`, don't trust the silence.
- **Resend**: `send.notemaxxing.net` verified via DKIM (Resend's Cloudflare
  auto-config). DNS is on Cloudflare. DMARC is `p=reject` — strict, so a bad SPF
  won't degrade gracefully. No MX record, so **bounce/complaint feedback doesn't
  route back** — a dead address fails silently. Revisit if mail goes missing.
- **Resend account**: one paid account ($20/mo) shared across projects, same as
  garm. Reputation is per-domain, so no isolation problem.
- **Learners**: Max Lovejoy <lovejoymaximillion@gmail.com>, Nico
  <nlovejoy@me.com>. Both are customers — Nico plays along too, and gamifying
  the pair is a someday idea.
- **Vercel env set**: `LEARN_TOKEN_SECRET`, `CRON_SECRET`, `RESEND_API_KEY` now
  in Production + Development (2026-07-16). **Preview is still missing all three**
  — the `vercel env add ... --force` loop hit the interactive `? Git branch?`
  prompt and the piped value was eaten. Add them to Preview one at a time
  (answer the branch prompt = empty) before relying on a preview deploy.
  1Password items (`dev-secrets`): `notemaxxing-token-secret`,
  `notemaxxing-cron-secret`, `resend-notemaxxing`. `ANTHROPIC_API_KEY` not needed
  until M5 ("Anthropic - notemaxxing API key" in 1Password). `NEXT_PUBLIC_SITE_URL`
  = notemaxxing.net, but **prod still runs the pre-repurpose notes app** (unknown
  paths 302 to home, not 404) until this branch deploys.
- **Vercel plan is Pro** — confirmed via `ibuild4you`'s `*/5` cron, which Hobby
  would reject. This matters: Hobby caps cron at once-per-day, and on a
  once-daily cron the per-learner local-hour gate would match in summer and
  **silently never match in winter**. If the plan ever downgrades, drop the hour
  gate and rely on `hasDeliveryFor` alone.

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
- **Content lives in git, not behind an endpoint.** The old plan (rebuild
  `/api/import` with API-key auth) was dropped: a public endpoint + key + rotation
  is a lot of surface for a one-person authoring workflow against a DB you already
  hold credentials for. `content/*.json` → `npm run import` instead — reviewable,
  diffable, revertable.
- **Answer page is single-theme by design.** It's the landing spot for the
  cream+navy email, so it commits to fixed brand light colors rather than
  inheriting OS dark mode. shadcn/ui decision deferred to the M6 dashboard, where
  the real component surface lives; not worth it for one form.

## Next Steps

1. **Author the real content bank** (next session, with fable). Use
   `content/neuro-sample.json` as the format template — hand it to Claude.ai,
   author a real batch, drop it in `content/`. `npm run import -- <file>` against
   the dev branch to validate + preview.
2. **Ship to prod, then flip Max on.** In order: apply migration `0002` to `main`
   (`.env.local` at prod, `npm run db:migrate`), import the real bank to prod,
   push the branch + deploy (this replaces the old notes app so the emailed button
   resolves), add the three env vars to Vercel **Preview**, then set Max
   `is_active=true`.
3. **M5** — live adventure chat (SSE, turn cap, LLM-as-judge grading).
   `ANTHROPIC_API_KEY` needed here.
4. **M6** — dashboard (magic link, same HMAC primitive) + landing page. Decide
   shadcn/ui here.

### Known / deferred

- **Analytics**: use the ecosystem standard — first-party beacon
  (`<Script src="https://prompt-labs.org/beacon.js" strategy="afterInteractive"/>`
  in the root layout) → Turso. `@vercel/analytics` is still wired in
  `app/layout.tsx` from a 2026-07-05 commit; prompt-lab has an open decision
  about dropping it where the beacon covers a site. Nico: "use our standard
  approach, but that can wait."
- **Content bank doesn't exist yet.** Nico authors it via Claude.ai and imports.
  Max is in on it and can request topics. Nothing works without it.
- `OPENAI_API_KEY` in Vercel is dead (notemaxxing moved to Claude in `9dd2e6f`)
  but the KEY may be shared — `split-recording-dev` reads
  `op://dev-secrets/openAI-recountly-secret-key`. Remove the var; **don't revoke
  the key** without checking the OpenAI console.
- Firebase admin key `55ad6e5e…` revoked 2026-07-15. The GCP project
  `notemaxxing` and Max's old notes still exist, untouched — decision deferred.
  Dead Vercel vars (5× Firebase, IMPORT\_\*, OPENAI, ENABLE_AI) still need removing.
- `next lint` is deprecated and goes away in Next 16 — migrate to the ESLint CLI.
- Remaining audit noise: 3 moderate, all one `postcss` cascade.
- Garm's own cron→Resend pipeline was unverified as of 2026-07-14. We build the
  same path at M3; if it breaks the same way, that's a shared cause.
- **drizzle-kit generates broken migrations** for PK changes: it emits
  `ADD CONSTRAINT ... PRIMARY KEY` before the `ADD COLUMN` it references and
  comments out the old PK drop. Hand-edit and let the PGlite tests validate it
  before it reaches Neon (that's what caught `0001`).

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
