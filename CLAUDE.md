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
- **AI Model**: `claude-sonnet-4-20250514`
- **Firebase project**: `piano-house-shared` (notemaxxing-only, soiree migrated to `soiree-d564a`)
- **Indexes**: deployed via `firestore.indexes.json` — run `firebase deploy --only firestore:indexes --project piano-house-shared`
- **Note reordering**: drag-and-drop via dnd-kit, `position` field with gap-based integers, lazy backfill

## Next Steps

1. `useEscapeNavigation` hook — Escape walks up breadcrumbs, guards unsaved work
2. Study features MVP — `docs/study-features-mvp.md`
3. Sharing hardening — `docs/sharing-hardening.md`
