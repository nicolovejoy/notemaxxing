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
- Auth: Firebase Auth (Google sign-in only), Bearer token on all API requests

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

## Current State

- **Build**: Passing ✅
- **Auth**: Firebase (Google + email/password) — Supabase fully removed
- **AI Model**: `claude-sonnet-4-20250514`
- **Firebase project**: `piano-house-shared` (shared with soiree)
- **Indexes**: deployed via `firestore.indexes.json` — run `firebase deploy --only firestore:indexes` to rebuild

## Next Steps

1. Fix React Query cache invalidation after accept-invite and create-notebook-in-shared-folder (UI requires manual refresh)
2. Write `firestore.rules` and deploy for defense-in-depth
3. Test archive notebook, delete folder flows
4. Test share revoke flow

## Planned Features

- **Quizzmaxxing** - Quiz-based learning (multiple choice, fill-in-blank)
- **Typemaxxing** - Typing-based learning (type from memory, WPM tracking)
- Separate features, both use AI to generate questions from notes
