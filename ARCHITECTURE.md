# Architecture

## System Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Next.js   │────▶│  API Routes  │────▶│  Supabase   │
│   Frontend  │     │   (Backend)  │     │  PostgreSQL │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       ▼                    ▼
  React Query          Validation
   (caching)          & Security
```

## Data Flow

### Standard Pattern

```
Component → API Route → Supabase → Database
```

### Exception: Realtime

`usePermissionSync` subscribes directly to Supabase Realtime for permission changes. Allowed because it's read-only and only triggers cache invalidation.

## API Structure

```
/app/api/
├── folders/
├── notebooks/
├── notes/
├── permissions/
├── invitations/
└── ai/enhance/
```

## Security

- No RLS currently (migration prepared)
- All security at API layer
- Service role key for database access
- API routes validate permissions

## Ownership

- Folders: owner = creating user
- Notebooks: owner = folder.owner_id
- Notes: owner = notebook.owner_id

## Sharing

- Folder-only (not notebooks/notes)
- Permissions cascade: Folder → Notebooks → Notes
- Levels: `read` or `write`

## State Management

- **React Query**: Server state, caching, refetching
- **Zustand**: UI state

## Database Schema

Key tables: `folders`, `notebooks`, `notes`, `permissions`, `invitations`, `quizzes`, `questions`

Full schema: `/infrastructure/setup-database.sql`
