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

### 1. Route Restructuring

**Rename for clarity**:

- `/folders` → `/backpack` (college-friendly)
- `/notebooks/[id]` → `/folders/[id]` (shows folder's notebooks)
- Create `/notebooks/[id]` for actual notebook detail

### 2. Fix Sharing UI Placement

**Move share buttons from cards to headers**:

- Remove from collection view cards
- Add to detail page headers only
- Keep share indicators on cards

### 3. Implement Permission Inheritance

**Folder permissions cascade to notebooks**:

- Notebooks inherit folder permissions by default
- Allow explicit overrides
- Show warnings for conflicts

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
