# Current Status - Notemaxxing Refactor

## Date: 2025-01-13

## What's Working

### ✅ Completed

1. **Home Page** - Uses ViewStore, displays stats correctly
2. **Folders Page** -
   - Uses ViewStore pattern
   - Shows notebooks within each folder card
   - Individual notebooks are clickable
   - No infinite loops
3. **Server-side Filtering** - Implemented for notebook notes with database indexes
4. **ViewStore Architecture** - Core implementation complete with request deduplication

## What's Broken

### 🔴 Critical Issues

1. **Notebook Page Navigation**
   - Currently expects notebook ID but receives folder ID
   - Results in 404 errors when clicking folders
   - Debug revealed: ID `0db8281c-1aae-4f55-8f42-04e4a33ed714` is a folder, not notebook

### 🟡 Needs Migration

1. **shared-with-me page** - Still uses old store (`useOrphanedSharedNotebooks`)
2. **typemaxxing page** - Still uses old store (`useNotebooks`, `useNotesInNotebook`)
3. **quizzing page** - Still uses old store

## Architecture Decisions

### ViewStore Pattern (Working)

- Each page loads only its required data
- No global state with all entities
- Server-side filtering and aggregation
- Stable references prevent re-render loops

### Database Improvements

- Added PostgreSQL indexes for search performance:
  ```sql
  CREATE INDEX idx_notes_title_trgm ON notes USING gin(title gin_trgm_ops);
  CREATE INDEX idx_notes_notebook_updated ON notes(notebook_id, updated_at DESC);
  CREATE INDEX idx_notes_notebook_created ON notes(notebook_id, created_at DESC);
  CREATE INDEX idx_notes_notebook_title ON notes(notebook_id, title);
  ```

## Next Session TODO

### Priority 1: Fix Notebook Page - TWO APPROACHES

#### Option A: Simple Fix (RECOMMENDED)

**Include most_recent_notebook_id in folder metadata**

- Modify `/api/views/folders` to include `most_recent_notebook_id` for each folder
- When clicking folder, navigate directly to that notebook ID
- No extra API calls needed
- No ID type detection needed

**Implementation**:

```typescript
// In API: Add to each folder
const mostRecentNotebook = await supabase
  .from('notebooks')
  .select('id')
  .eq('folder_id', folder.id)
  .order('updated_at', { ascending: false })
  .limit(1)
  .single()

folder.most_recent_notebook_id = mostRecentNotebook?.id || null

// In folders page
const handleFolderClick = (folderId: string) => {
  const folder = folders.find((f) => f.id === folderId)
  if (folder?.most_recent_notebook_id) {
    router.push(`/notebooks/${folder.most_recent_notebook_id}`)
  }
}
```

**Why this is best**:

- Single API call on page load
- No extra requests when clicking
- Notebook page stays simple (only handles notebook IDs)
- Clean separation of concerns

#### Option B: Workspace View (More Complex)

**Make notebook page handle both folder and notebook IDs**

- Shows all notebooks in folder (sidebar)
- Main area shows selected notebook's notes
- More like Notion/Obsidian
- Better UX but more complex

**Why Option B might be overkill**:

- We already show notebooks in folder cards
- Users can click specific notebooks
- Adding folder ID handling adds complexity
- Requires ID type detection, extra API calls

**Recommendation**: Try Option A first. It's simpler and might be sufficient.

### Priority 2: Fix Notebook Cards UI

**Current Issue**: Notebooks in folders are shown as text list items
**Desired**: Small cards within the folder card (like production screenshot)

**Visual Requirements**:

- Each notebook should be a small card with:
  - Color indicator (dot or border)
  - Notebook name
  - Note count
  - Hover state
  - Click to navigate
- Grid or stacked layout within folder card
- Similar to production screenshot provided

### Priority 3: Complete Migrations

1. Migrate remaining pages to ViewStore
2. Remove old data-store completely
3. Update all imports

## Key Files Changed

### New/Modified APIs

- `/api/views/folders` - Now includes notebook metadata
- `/api/views/notebooks/[notebookId]/notes` - Server-side filtering
- `/api/folders/[folderId]/recent-notebook` - Gets most recent notebook

### Modified Components

- `/app/folders/page.tsx` - Shows notebooks within folders
- `/app/notebooks/[id]/page.tsx` - Needs refactor for folder/notebook dual support
- `/lib/store/view-store.ts` - Core ViewStore implementation

## Critical Code Patterns

### ✅ Correct Pattern

```typescript
// Server-side filtering
const { data } = await fetch('/api/views/folders')
const folders = data.folders // Use directly, no client filtering
```

### ❌ Avoid

```typescript
// Client-side filtering - causes re-renders
const filtered = notebooks.filter(...) // Creates new array every render
```

## Known Issues to Address

1. **Notebook page expects wrong ID type** - Needs to handle both folder and notebook IDs
2. **Missing inline editing** - Notebook names should be editable on folders page
3. **No empty states** - When folder has no notebooks
4. **Old store still in use** - Some pages not migrated

## Session Accomplishments

1. Fixed infinite loop issues by removing client-side filtering
2. Implemented server-side filtering with database indexes
3. Updated folders page to show notebooks within each folder
4. Identified root cause of notebook page 404 errors
5. Established correct UX pattern for notebook page (workspace view)

## Environment Setup

- Database indexes are created and working
- ViewStore pattern established
- Server-side filtering implemented
- Debug utilities in place

## Next Steps for New Context

1. Start by reading this document
2. Implement notebook page as workspace view (folder + notebooks + notes)
3. Complete remaining page migrations
4. Remove old store code
