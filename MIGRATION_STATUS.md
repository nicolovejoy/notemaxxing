# Migration Status - View-Based Architecture

## Overview

Migrating from global store (loads everything) to view-based architecture (loads only what's visible).

## Page Migration Status

### ✅ Fully Migrated

- `/app/page.tsx` - Home page
- `/app/folders/page.tsx` - Folders view
- `/app/notebooks/[id]/page.tsx` - Notebooks view (needs params fix)

### 🔴 Needs Migration

- `/app/shared-with-me/page.tsx` - Partially updated, needs completion
- `/app/typemaxxing/page.tsx` - Uses old patterns
- `/app/quizzing/page.tsx` - Uses old patterns

### ⚠️ Special Cases

- `/components/admin-console.tsx` - Intentionally uses `useNotes()` for data export

## Hook Migration Status

### ✅ Updated

- Removed `useNotes()` from most components
- Created new ViewStore hooks

### 🔴 Needs Update

- `useNavigateToRecentNotebook` - Simplified but needs more work
- Various component-level hooks still reference old store

## API Routes Status

### ✅ Created

- `/api/views/folders` - Folder view data (using DB views)
- `/api/views/folders/[folderId]/notebooks` - Notebook view (using DB views)
- `/api/views/notebooks/[notebookId]/notes` - Notes list
- `/api/views/notebooks/[notebookId]/notes/[noteId]` - Single note
- `/api/folders` - Folder CRUD
- `/api/notebooks` - Notebook CRUD
- `/api/notes` - Note CRUD

### 🔴 Needs Creation

- `/api/search` - Server-side search
- `/api/views/stats` - Dashboard statistics (partially using DB views)

## Store Status

### ✅ New Implementation

- `lib/store/view-store.ts` - Complete

### 🔴 To Be Removed

- `lib/store/data-store.ts` - Old global store
- `lib/store/hooks/useDataStore.ts` - Old hooks
- `lib/store/data-manager.ts` - Old manager pattern

## Next Migration Steps

1. **Notebook Page** (`/app/notebooks/[id]/page.tsx`)
   - Create `loadNotebookView()` usage
   - Remove all `useNotes()` calls
   - Update to use ViewStore

2. **Note Editor Integration**
   - Update RichTextEditor to save via API
   - Remove direct store updates

3. **Search Implementation**
   - Create `/api/search` endpoint
   - Remove client-side filtering

4. **Final Cleanup**
   - Delete old store files
   - Update all imports
   - Remove legacy code

## Breaking Changes

### For Future Development

1. Never use `useNotes()` - it loads everything
2. Never filter in render functions
3. Always use ViewStore patterns
4. Server-side aggregation only

### Component Patterns

```typescript
// OLD (DO NOT USE)
const Component = () => {
  const notes = useNotes()
  const filtered = notes.filter(...)
  // ❌ Creates infinite loops
}

// NEW (USE THIS)
const Component = () => {
  const noteView = useNoteView()
  useEffect(() => {
    loadNoteView(notebookId)
  }, [notebookId])
  // ✅ Stable references
}
```

## Performance Targets

- Initial load: < 200ms
- Navigation: < 150ms
- Memory usage: < 50MB
- Support for 10,000+ notes

## Critical Files

- `ARCHITECTURE_V2.md` - New architecture documentation
- `HANDOFF_SESSION3.md` - Latest session changes
- `lib/store/view-store.ts` - New store to use
- `app/folders/page.tsx` - Reference implementation
