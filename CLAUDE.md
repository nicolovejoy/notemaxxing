# Claude Guidelines - Notemaxxing

## Critical Rules

### Database

- **Firestore** — collections: folders, notebooks, notes, permissions, invitations, invitationPreviews
- Fields use snake_case; doc ID becomes the `id` field
- Timestamps stored as ISO strings

### Data Flow

```
Component → API Route → Firebase Admin SDK → Firestore
```

- **NEVER** use Firebase/Firestore directly in components
- Auth: Firebase Auth (Google + email/password), Bearer token on all API requests

### Ownership Model

- `owner_id` required on all resources
- Notebooks inherit folder's `owner_id`
- Notes inherit notebook's `owner_id` and `folder_id`

### Sharing Model

- **FOLDER-ONLY** - Cannot share notebooks or notes directly
- Contents inherit folder permissions
- Levels: `read` (view) or `write` (edit)
- Email invitations with 7-day expiry

## Coding Standards

1. Plan approach with user before coding
2. TypeScript - proper types, avoid `any`
3. Run `npm run format` after changes
4. Must pass `npm run build` before pushing

## State Management

- **React Query**: All data fetching — `useFoldersView()`, `useFolderDetailView()`, `useNotebookView()`, mutations with cache invalidation
- **Direct `apiFetch()`**: One-off actions (note save, delete, reorder, sort persist, share dialog)

## Current State

- **Build**: Passing ✅
- **Auth**: Firebase (Google + email/password) — Supabase fully removed
- **AI Model**: `claude-sonnet-4-6`
- **Firebase project**: `notemaxxing` (nam5 multi-region US)
- **Indexes**: deployed via `firestore.indexes.json` — run `firebase deploy --only firestore:indexes --project notemaxxing`
- **Note reordering**: drag-and-drop via dnd-kit, `position` field with gap-based integers, lazy backfill
- **Brand**: Navy (#1A3C6B) / cream (#F8F8F0) / slate (#4A6E91), Montserrat headings, Open Sans body, book+arrow logo

## Status: MOTHBALLED (2026-05-19)

Site is taken down. Landing page shows red [OUT OF SERVICE] banner. `middleware.ts` redirects all non-root routes → `/` (except `_next/*`, `/api/import` preserved for prompt-lab). To revive: delete `middleware.ts` and revert `app/page.tsx` to commit `0937d44`.

## Next Steps

1. Decide whether to fully retire or revive
2. If reviving: dark mode visual QA, study chat persistence, sharing hardening (`docs/sharing-hardening.md`)

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
