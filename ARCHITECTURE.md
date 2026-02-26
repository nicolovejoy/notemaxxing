# Architecture

## System Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Next.js   │────▶│  API Routes  │────▶│  Firestore  │
│   Frontend  │     │   (Backend)  │     │  (NoSQL)    │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       ▼                    ▼
  Zustand / RQ         Firebase Admin
   (client)              SDK (server)
```

## Data Flow

```
Component → apiFetch() → API Route → Firebase Admin SDK → Firestore
```

- All API calls go through `lib/firebase/api-fetch.ts` which attaches the Firebase Auth Bearer token
- **NEVER** use Firebase/Firestore directly in components
- Auth: Firebase Auth (Google + email/password)

## State Management

Two layers, used by different parts of the app:

**Zustand (`view-store`)** — primary for the notebook page:

- `loadNoteView()` fetches notebook metadata + paginated notes list
- Notes list, sort, search all managed through the store
- Components do optimistic updates locally, fire `apiFetch()` in background
- Used by: `/notebooks/[id]` page

**React Query** — primary for folders/backpack:

- `useFoldersView()`, `useFolderDetailView()` with stale-time caching
- Mutations (`useCreateFolder`, `useUpdateFolder`, etc.) with cache invalidation
- Used by: `/` (home), `/backpack`, `/folders/[id]` pages

**Direct `apiFetch()`** — used for one-off actions:

- ShareDialog, admin console, note editor save/create/delete
- No caching layer; fire-and-forget with manual list refresh

**Unused**: `uiStore` (Zustand) is defined but not consumed by any page — dead code.

## API Structure

```
/app/api/
├── folders/
├── notebooks/
├── notes/
│   ├── route.ts          # CRUD (POST/PATCH/DELETE)
│   └── reorder/route.ts  # PATCH position for drag-and-drop
├── permissions/
├── shares/
│   ├── invite/
│   ├── accept/
│   ├── generate-link/
│   ├── list/
│   └── revoke/
├── views/
│   ├── folders/          # Aggregated folder views
│   └── notebooks/        # Aggregated notebook + notes views
├── ai/enhance/
├── typing/generate/
└── admin/
```

View routes (`/api/views/*`) return pre-aggregated data for specific pages — folder stats, notebook metadata + notes list, sibling notebooks, etc.

## Security

- All authorization at the API layer (no Firestore security rules yet)
- Firebase Admin SDK with service account for database access
- API routes verify Bearer token → Firebase Auth UID → ownership/permission checks
- `firestore.rules` not yet deployed (next step for defense-in-depth)

## Ownership

- Folders: `owner_id` = creating user
- Notebooks: `owner_id` = folder's `owner_id`
- Notes: `owner_id` = notebook's `owner_id`, `folder_id` = notebook's `folder_id`

## Sharing

- **Folder-only** — cannot share notebooks or notes directly
- Permissions cascade: Folder → Notebooks → Notes
- Levels: `read` (view) or `write` (edit)
- Email invitations with 7-day expiry, shareable links

## Note Ordering

Notes support manual drag-and-drop reordering via `position` field:

- Gap-based integers (spacing of 1000)
- New notes get `max_position + 1000`
- Reorder computes midpoint of neighbors
- Lazy backfill: first `sort=manual` request assigns positions to legacy notes
- Drag-and-drop: dnd-kit with optimistic local state, API call in background

## Firestore Collections

`folders`, `notebooks`, `notes`, `permissions`, `invitations`, `invitationPreviews`

- Fields use `snake_case`; doc ID becomes the `id` field
- Timestamps stored as ISO strings
- Indexes defined in `firestore.indexes.json` — deploy with `firebase deploy --only firestore:indexes --project piano-house-shared`
