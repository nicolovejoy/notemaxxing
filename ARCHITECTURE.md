# Architecture - Notemaxxing

Technical implementation details.

## System Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Next.js   │────▶│   API Routes │────▶│  Supabase   │
│   Frontend  │     │   (Backend)  │     │  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
  React Query          Validation            PostgreSQL
   (caching)          & Security              (storage)
```

## Database Schema

Full schema: `/infrastructure/setup-database.sql`

Key tables: `folders`, `notebooks`, `notes`, `permissions`, `invitations`

Ownership model: Resources inherit `owner_id` from parent

## Data Flow Patterns

### ViewStore Pattern

Each page loads only required data:

```typescript
// Good - Scoped to current view
const foldersView = useFoldersView()

// Bad - Loads everything
const allNotes = useNotes()
```

### API Route Structure

```
/app/api/
├── folders/
│   ├── route.ts          # GET (list), POST (create)
│   └── [id]/
│       └── route.ts      # GET, PUT, DELETE
├── notebooks/
├── notes/
├── permissions/
└── invitations/
```

### Security Model

1. **No Row Level Security (RLS)**
   - All security implemented at API layer
   - Service role key used for database access
   - API routes validate permissions

2. **Permission Checks**

   ```typescript
   // Every API route checks permissions
   const hasAccess = await checkUserPermission(userId, resourceId)
   if (!hasAccess) return unauthorized()
   ```

3. **Ownership Inheritance**
   - Folders: owner = creating user
   - Notebooks: owner = folder.owner_id
   - Notes: owner = notebook.owner_id

## State Management

### Server State (React Query)

- All data fetching
- Automatic caching
- Background refetching
- Optimistic updates

### UI State (Zustand)

- Complex UI interactions
- Multi-step forms
- Temporary state

### Real-time Updates

- Supabase Realtime (partially configured)
- Requires manual cache invalidation for some operations
- Known issue: permission changes don't propagate immediately

## Infrastructure

- **Schema**: Terraform managed (`/infrastructure/terraform/`)
- **Hosting**: Vercel (auto-deploy on push)
- **Database**: Supabase (`dvuvhfjbjoemtoyfjjsg`)
- **Auth**: Supabase Auth

## Performance Considerations

### Database Queries

- Server-side aggregation for counts
- Pagination built into APIs
- Indexed on common query patterns

### Frontend Optimization

- React Query deduplicates requests
- Stale-while-revalidate caching
- Lazy loading of editor components

## Known Technical Debt

1. **Real-time sync**: Partial implementation, needs completion
2. **TypeScript warnings**: ~7 unused variable warnings
3. **Admin system**: Emails hardcoded in API routes
4. **Testing**: No test suite yet
5. **Error handling**: Could be more consistent

## Future Architecture Considerations

- Move to tRPC for type-safe API
- Consider server components for initial data
- Implement proper observability
- Add rate limiting to API routes
