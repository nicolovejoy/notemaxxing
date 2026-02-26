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
- **Firebase project**: `piano-house-shared` (shared with soiree)
- **Indexes**: deployed via `firestore.indexes.json` — run `firebase deploy --only firestore:indexes --project piano-house-shared`
- **Note reordering**: drag-and-drop via dnd-kit, `position` field with gap-based integers, lazy backfill

## Next Steps

1. Deploy Firestore indexes + rules — `firebase deploy --only firestore:indexes,firestore:rules --project piano-house-shared`
2. Prefetching/caching strategy — reduce DB round-trips, discuss Redux-like layer alongside React Query
3. Shared DB separation — `piano-house-shared` is shared with soiree, need collection prefixing or separate project
4. AI study topic generator → typemaxxing + quizzmaxxing integration

## Planned Features

- **Quizzmaxxing** - Quiz-based learning (multiple choice, fill-in-blank)
- **Typemaxxing** - Typing-based learning (type from memory, WPM tracking)
- Separate features, both use AI to generate questions from notes
