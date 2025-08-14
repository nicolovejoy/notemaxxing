# Architecture Update - View-Based Data Loading

**Latest Status**: See CURRENT_STATUS.md for session progress
**Latest Fix**: Complete architecture overhaul - See HANDOFF_SESSION3.md

## Current Architecture

- **ViewStore**: Each page loads only its data
- **No Global Loading**: Never load all notes/notebooks
- **Server Aggregation**: Counts computed in database
- **Stable References**: No filtering in render functions

## Design System

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - use existing UI components only.

## Rules

- Be succinct
- No .md files unless asked
- Ask before committing
- Run `npm run format` after changes

## Next Tasks (Priority Order)

### 1. Fix Notebook Navigation

**Simple Solution**: Add `most_recent_notebook_id` to folder metadata in `/api/views/folders`

- No extra API calls
- Navigate directly to notebook ID
- Keep notebook page simple

### 2. Fix Notebook Cards UI

**Current**: Notebooks shown as text list items
**Needed**: Small cards within folder cards (like production)

- Each notebook as a mini card with color, name, note count
- Grid/stack layout inside folder card
- Proper hover states and styling

## Critical: New Data Pattern

**DO NOT** use old patterns like:

```typescript
const notes = useNotes() // ❌ Loads everything
const filtered = notes.filter(...) // ❌ Creates new arrays
```

**DO** use new ViewStore pattern:

```typescript
const foldersView = useFoldersView() // ✅ Only current view
const { loadFoldersView } = useViewActions() // ✅ Load on demand
```

See ARCHITECTURE_V2.md for complete details.
