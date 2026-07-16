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

- **🎉 LIVE as of 2026-07-16.** PR #13 squash-merged (`5e3890c`); prod is the
  Daily Learning Companion, not the old notes app (verified: bad token renders
  the DeadLink page, unknown paths 404, `/api/cron/daily` 401s without the
  secret). **Max is `is_active=true`, send hour 10 local** — first real question
  lands Fri 2026-07-17 ~10:00–10:15 PDT. Nico active at hour 7.
- **Build**: passing. **Tests**: 271 passing, ~30s. Branch: `content/ochem-bank`
  → PR open against main (the bank + docs; PR #13 merged before it was pushed,
  so main briefly lagged).
- **Done**: M0 (harness+schema+CI), M1 (pure core), M2 (query layer),
  M3 (email+Resend+cron), **smoke test** (first real email delivered to Nico via
  Resend 2026-07-15), **M4** (answer page + respond handler), **content import**
  (git JSON → zod → idempotent upsert), **content bank + prod cutover**
  (2026-07-16).
- **Prod DB state**: migrations `0000`–`0002` applied to `main`. 39 active
  content_items (all `ochem/`-prefixed, batch `ochem-foundations`), 15 concepts,
  all `chem/organic`. Zero NULL `external_id`. Legacy neuro sample + the one
  smoke-test delivery/response were deleted at cutover. Cleared **before**
  migrating `0002`, so the orphan state never existed.
- **M4 shape**: `/learn/r/[token]` (page.tsx + quiz-form.tsx) + `POST
/api/learn/respond` → `lib/handlers/respond.ts`. Idempotent on
  `responses.delivery_id` UNIQUE; response time server-derived from the
  `link_clicked` event (not client-trusted); answer key never in the initial
  page payload. Page is **single-theme** (fixed brand hex, not the OS-reactive
  tokens — those inverted `--brand-charcoal` to near-white over white cards).
- **Content pipeline**: author batches as `content/*.json`, `npm run import --
<file>`. Validated by `lib/content/schema.ts` (zod), upserted by
  `lib/handlers/import-content.ts`. Idempotent via `external_id`. No endpoint, no
  API key — a script the author runs. `content/ochem-foundations.json` is the
  template. `batch_id` is a **stable handle**, not a label — `deactivateMissing`
  finds prior items by it, so never date it or bump it across a revision.
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
  Migrations `0000`–`0002` on **both** branches as of 2026-07-16.
  `drizzle-kit migrate` prints nothing on success — verify against
  `drizzle.__drizzle_migrations`, don't trust the silence. Endpoints:
  `main` = `ep-wild-river-at89syk6`, `dev` = `ep-bold-cake-atru59l4` (the
  endpoint id does not contain the branch name — check it, don't eyeball it).
  To target a branch for one command, pass `DATABASE_URL` inline: an inline var
  wins, because dotenv does not override what is already set.
- **Resend**: `send.notemaxxing.net` verified via DKIM (Resend's Cloudflare
  auto-config). DNS is on Cloudflare. DMARC is `p=reject` — strict, so a bad SPF
  won't degrade gracefully. No MX record, so **bounce/complaint feedback doesn't
  route back** — a dead address fails silently. Revisit if mail goes missing.
- **Resend account**: one paid account ($20/mo) shared across projects, same as
  garm. Reputation is per-domain, so no isolation problem.
- **Learners**: Max Lovejoy <lovejoymaximillion@gmail.com>, Nico
  <nlovejoy@me.com>. Both are customers — Nico plays along too, and gamifying
  the pair is a someday idea.
- **Vercel env set**: `LEARN_TOKEN_SECRET`, `CRON_SECRET`, `RESEND_API_KEY` now in
  **all three** envs — Production + Development (2026-07-16), Preview (added with
  `vercel env add ... --value` so the branch prompt no longer eats the value; press
  Enter at `? Git branch?` = all preview branches). 1Password items
  (`dev-secrets`): `notemaxxing-token-secret`, `notemaxxing-cron-secret`,
  `resend-notemaxxing`. `ANTHROPIC_API_KEY` not needed until M5 ("Anthropic -
  notemaxxing API key" in 1Password). `NEXT_PUBLIC_SITE_URL` = notemaxxing.net,
  which as of 2026-07-16 **serves the Daily Learning Companion** — the old notes
  app is gone from prod.
- **⚠️⚠️ Preview `DATABASE_URL` still points at prod `main`** (Neon integration
  default). A preview deploy that touches the DB writes to production. **This got
  sharper on 2026-07-16**: prod is no longer a sandbox with throwaway rows — it
  holds the real bank and a live learner, so a preview deploy can now corrupt
  Max's actual mastery state or burn a delivery. Fix before the next PR: point
  Preview at the `dev` branch (quick, matches local), or enable Neon per-preview
  auto-branching (cleaner, a toggle in the integration).
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
- **Engagement before friction.** Don't ask Max to confirm his course, textbook,
  or schedule before the daily loop has hooked him — the first email is the
  engagement, and a questionnaire in front of it is the same friction the
  no-login rule exists to avoid. Author on assumption instead: the content keys
  to concepts, never to chapter numbers, so a wrong guess about his textbook or
  which block he's in costs nothing (CHEM 31/32/33 are all required for his
  major). Revisit once he's answering regularly.
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

1. **Watch the first real sends** (Fri 2026-07-17). Nico 7am, Max 10am PDT. The
   cron has never run against real content with an active learner — Nico's send
   is the dress rehearsal three hours ahead of Max's. Check: mail arrives, the
   `/learn/r/<token>` link renders the question, an answer records a `response`
   and moves `concept_state`. Failure here is invisible — Resend has no MX, so
   bounces don't route back.
2. **⚠️ Point Preview away from prod** — do this before the next PR merges. The
   Neon integration still gives Preview the prod `DATABASE_URL`, and prod is no
   longer a sandbox: it holds the real bank and a live learner, so a preview
   deploy that touches the DB can corrupt Max's mastery state or burn a
   delivery. Either point Preview at the `dev` branch or enable Neon per-preview
   auto-branching (a toggle in the integration).
3. **Author `ochem-carbonyls`** as Max hits CHEM 33 (assume Jul 27 — don't ask
   him, see "Engagement before friction"). Aldol, Claisen, EAS, amines,
   carbohydrates, amino acids. Use `content/ochem-foundations.json` as the
   template; `npm run import -- <file>` against dev first. Fact-check the answer
   keys with a subagent before importing to prod — the first pass caught a real
   error a non-chemist could not have.
4. **M5** — live adventure chat (SSE, turn cap, LLM-as-judge grading).
   `ANTHROPIC_API_KEY` needed here. Note the bank is **quiz-only** on purpose:
   an `adventure` item would be selected and emailed, then dead-end on a page
   that cannot run the chat.
5. **M6** — dashboard (magic link, same HMAC primitive) + landing page. Decide
   shadcn/ui here. This is also where "what did Max actually get?" gets
   answered — there is no cc on the daily mail by design (`SendFn` has no cc
   field; Nico is a separate learner, not an observer).

### Known / deferred

- **Adding a UNIQUE column to a populated table makes silent orphans.** `0002`
  added `content_items.external_id`; every existing row got NULL. Those rows stay
  active and emailable but are **invisible to an import that matches on
  `external_id`** — so a re-import creates a duplicate beside the orphan instead
  of updating it. Postgres `UNIQUE` permits multiple NULLs, so the constraint
  catches nothing, and `GROUP BY external_id HAVING count(*) > 1` buckets all the
  NULLs together and looks like one duplicate. Seen on dev ("The rising phase"
  twice). Handled at the 2026-07-16 prod cutover by clearing **before**
  migrating. Same trap next time a UNIQUE column lands on live rows: clear or
  backfill first.
- **Dead Firebase config still tracked**: `.firebaserc`, `firebase.json`,
  `firestore.indexes.json`, `firestore.rules`. Left deliberately — the GCP
  project holding Max's old notes still exists (decision deferred), and these are
  what you'd need to export them. Delete once that's settled.
- **Stale branches**: `feat/daily-learning-companion` and `content/ochem-bank`
  are both squash-merged (git shows them unmerged — different SHAs).
  `infra/database-as-code` has one unpushed commit from Aug 2025 fixing a
  notes-app bug in code that no longer exists. All three are safe to delete.
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
