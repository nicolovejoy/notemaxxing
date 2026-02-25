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
- **Auth**: Firebase (Google sign-in) — Supabase fully removed
- **AI Model**: `claude-sonnet-4-20250514`
- **Next**: Functional testing with real Firebase env vars

## Next Steps

1. Run `npm run dev`, verify Google sign-in works
2. Check `lib/api/sharing.ts` — confirm it sends Bearer token
3. Test CRUD: folder → notebook → note
4. Test share invite flow end-to-end

## Planned Features

- **Quizzmaxxing** - Quiz-based learning (multiple choice, fill-in-blank)
- **Typemaxxing** - Typing-based learning (type from memory, WPM tracking)
- Separate features, both use AI to generate questions from notes
