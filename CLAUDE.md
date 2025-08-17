# Project Guidelines for Claude

## Current State (August 2024)

- **Database**: New Supabase project `vtaloqvkvakylrgpqcml` with code-managed schema
- **Sharing**: Folder and notebook sharing working with email invitations
- **Auth**: Working with proper owner_id throughout

## Architecture Rules

- **ViewStore Pattern**: Each page loads only its data (no global loading)
- **Server Aggregation**: Counts computed in database, not client
- **Ownership Model**: `owner_id` = resource owner, `created_by` = creator

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
- User emails display as IDs (need auth.users access function)
- Share buttons needed on notebook cards

## Testing Accounts

When testing sharing, use different browser sessions or incognito mode.

## Important Patterns

```typescript
// ✅ GOOD - ViewStore pattern
const foldersView = useFoldersView()

// ❌ BAD - Global loading
const notes = useNotes()
```

## Don't Trust Old Docs

Always verify in code - many markdown files are outdated.
