# Project Guidelines for Claude

## Current State (August 2024)

- **Database**: New Supabase project `vtaloqvkvakylrgpqcml` with code-as-infrastructure
  - Schema defined in `/supabase/migrations/` - check here for table structure
  - All tables use `owner_id` (not `user_id`) for ownership
  - **Migration Process**: Nico runs `npx supabase db push` manually
  - **Important**: After migrations are applied, rename them to `.sql.applied`
- **Sharing**: Move-to-Control model - folders define access boundaries
  - Share folders, not individual notebooks
  - Move notebooks between folders to control access
  - Only owners can move notebooks (prevents theft)
- **Auth**: Working with proper owner_id throughout
- **Permissions**: Working with UPDATE policy, proper field names

## Architecture Rules

- **Data Fetching Pattern**:
  - Use React Query for all data fetching (consistency & caching)
  - Use ViewStore/Zustand only for complex editing state (notebook editor)
  - No direct Supabase calls in components - use API routes
- **Server Aggregation**: Counts computed in database, not client
- **Ownership Model**: `owner_id` = resource owner, `created_by` = creator
- **Sharing Model**: Folder-first - notebooks can only be shared within already-shared folders

## Coding Rules

1. Be succinct - keep responses short
2. Ask before making significant changes
3. Run `npm run format` after code changes
4. Check in with user frequently
5. Work in small chunks
6. Can run dev server for testing (ask first)

## Design System

Use existing UI components only - see `/components/ui/`

## Known Issues

- Real-time sync needs fixing
- Need to prevent notebook-only sharing in unshared folders
- Need to show creator info when created_by != owner_id

## Testing Accounts

When testing sharing, use different browser sessions or incognito mode.

## Important Patterns

```typescript
// ✅ GOOD - ViewStore pattern
const foldersView = useFoldersView()

// ❌ BAD - Global loading
const notes = useNotes()
```

## Future Sharing Features (Not Yet Implemented)

- **Notebook Transfer**: Dual-consent transfer when `created_by != owner_id`
- **Creator Rights**: Allow creators to reclaim notebooks they created
- **Granular Permissions**: Separate "create" from "write" permissions

## Don't Trust Old Docs

Always verify in code - many markdown files are outdated.
