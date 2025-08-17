# Project Guidelines

## Architecture

- **ViewStore**: Each page loads only its data
- **No Global Loading**: Never load all notes/notebooks
- **Server Aggregation**: Counts computed in database

## Sharing System

see [SHARING_ARCHITECTURE.MD](./SHARING_ARCHITECTURE.md)

## Design

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - use existing UI components only.

## Rules for Claude

- Be succinct
- Ask before coding. discuss first
- Ask before committing
- Run `npm run format` after changes
- Be careful, check in with user frequently
- Don't trust markdown files - verify in code that what they say is up to date
- keep a neutral tone
- Don't assume success
- work in smaller chunks. suggest we write a plan if you think that's wise.

## Current Issues

- Notebook visibility in shared folders partially working
- Need to add share indicators to cards
- Need notebook-level sharing -- code and UI

## Supabase Setup

- Project ref: ywfogxzhofecvuhrngnv
- CLI linked and configured -- let the user run the commands though
- See [SUPABASE_CLI_SETUP.md](./SUPABASE_CLI_SETUP.md) for details

## Critical: Data Pattern

**DO NOT** use old patterns:

```typescript
const notes = useNotes() // ❌ Loads everything
```

**DO** use ViewStore pattern:

```typescript
const foldersView = useFoldersView() // ✅ Only current view
```
