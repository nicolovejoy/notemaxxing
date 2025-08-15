# Permission Model Implementation Plan

## Overview

This document describes how to implement the architecture defined in `ARCHITECTURE_PERMISSIONS.md`. It maps the current state to the target state and provides a step-by-step migration plan.

## Current State Analysis

### Problems Identified

1. **Incomplete Permission Handling**: Only fetching folders where `user_id = currentUser`, missing shared folders
2. **Fragmented Data Fetching**: Multiple separate queries for folders, notebooks, permissions
3. **Type Mismatches**: Frontend expects computed fields (`shared`, `sharedByMe`) that don't exist in DB
4. **Inconsistent Permission Checks**: Different approaches in different API routes

### Current Database State (From Fresh Types)

- ✅ `permissions` table exists with proper structure
- ✅ `share_invitations` table for pending invites
- ✅ Views: `folders_with_stats`, `notebooks_with_stats`, `shared_resources_with_details`
- ✅ Function: `has_permission(user_id, resource_id, resource_type, permission)`

## Gap Analysis: Current vs Target

### What's Missing

1. **Ownership table**: Currently using `user_id` field as owner, need separate ownership tracking
2. **Permission levels**: Currently binary (has permission or not), need graduated levels
3. **Resource states**: `archived` exists but `locked` state doesn't
4. **Inheritance logic**: Not implemented in database or API
5. **Self-restriction**: No way for owners to limit their own access

## Implementation Plan

### Phase 1: Database Layer (Backend)

#### 1.1 Verify/Create Database Functions

**Location**: Supabase Dashboard / Migration Files

- [ ] Check if these functions exist:

  ```sql
  -- Get all folders accessible to user
  get_accessible_folders(user_id)
  -- Get all notebooks accessible to user
  get_accessible_notebooks(user_id)
  ```

- [ ] If not, create them or use existing views:
  - `shared_resources_with_details` view might already provide this
  - `folders_with_stats` + permissions join

#### 1.2 Database Schema Updates Needed

- [ ] Verify indexes on `permissions` table for performance
- [ ] Consider adding `last_accessed` to track recent items
- [ ] Add cascading deletes for permissions when resources are deleted

### Phase 2: API Routes (Backend)

#### 2.1 `/api/views/folders/route.ts`

**Current Issues**: Only fetches owned folders, separate orphaned notebook logic

**Required Changes**:

```typescript
// OLD: Only owned folders
.from('folders_with_stats')
.eq('user_id', userId)

// NEW: All accessible folders
.rpc('get_accessible_folders', { p_user_id: userId })
```

**Tasks**:

- [ ] Rewrite to fetch all accessible folders (owned + shared)
- [ ] Include permission level in response
- [ ] Include owner information for shared folders
- [ ] Properly handle orphaned notebooks

#### 2.2 `/api/views/notebooks/[notebookId]/notes/route.ts`

**Current Issues**: Permission check only for non-owners

**Required Changes**:

- [ ] Use `has_permission` function consistently
- [ ] Return permission level in response
- [ ] Handle folder-level permissions (inherited)

#### 2.3 `/api/views/notebooks/[notebookId]/notes/[noteId]/route.ts`

**Current Issues**: Similar permission issues

**Required Changes**:

- [ ] Consistent permission checking
- [ ] Consider note-level permissions (future)

### Phase 3: Type System (Frontend)

#### 3.1 Update ViewStore Types

**File**: `/lib/store/view-store.ts`

**Required Changes**:

```typescript
interface FoldersViewData {
  folders: Array<{
    // ... existing fields ...
    permission: 'owner' | 'write' | 'read'
    owner_id: string
    owner_email?: string // For shared folders
    shared_by?: string // Who shared it
    shared_at?: string // When it was shared
  }>
}
```

- [ ] Add permission fields to folder type
- [ ] Add permission fields to notebook type
- [ ] Add owner information fields
- [ ] Remove non-existent computed fields

#### 3.2 Fix Component Props

**Files**: Various component files

- [ ] Update `FolderCard` props to include permission
- [ ] Update `NotebookCard` props to include permission
- [ ] Update `NoteCard` props if needed

### Phase 4: UI Components (Frontend)

#### 4.1 Permission-Based UI Rendering

**Files**: Component files

- [ ] Show edit buttons only if `permission === 'write' || permission === 'owner'`
- [ ] Show share button only if `permission === 'owner'`
- [ ] Show delete button only if `permission === 'owner'`
- [ ] Add permission badge/indicator on shared items

#### 4.2 Restore Lost Features

- [ ] Bring back `ShareButton` component
- [ ] Restore `ShareDialog` component
- [ ] Add inline editing (with permission check)
- [ ] Restore archive/delete controls (with permission check)

### Phase 5: Edge Cases & Error Handling

#### 5.1 Permission Edge Cases

- [ ] Handle revoked permissions gracefully
- [ ] Handle deleted shared resources
- [ ] Handle permission upgrades/downgrades

#### 5.2 Error Messages

- [ ] Clear 403 error messages
- [ ] Handle network errors
- [ ] Optimistic updates with rollback

## File Change Checklist

### API Routes (Backend)

- [ ] `/app/api/views/folders/route.ts` - Complete rewrite for permissions
- [ ] `/app/api/views/folders/[folderId]/notebooks/route.ts` - Add permission checks
- [ ] `/app/api/views/notebooks/[notebookId]/notes/route.ts` - Fix permission logic
- [ ] `/app/api/views/notebooks/[notebookId]/notes/[noteId]/route.ts` - Fix permission logic
- [ ] `/app/api/folders/route.ts` - Update for permissions
- [ ] `/app/api/notebooks/route.ts` - Update for permissions
- [ ] `/app/api/notes/route.ts` - Update for permissions

### Store & Types (Frontend)

- [ ] `/lib/store/view-store.ts` - Update all interfaces
- [ ] `/lib/store/types.ts` - Align with database types
- [ ] `/lib/types/entities.ts` - Update entity types
- [ ] `/lib/store/supabase-helpers.ts` - Remove computed field logic

### Page Components

- [ ] `/app/page.tsx` - Update home page stats
- [ ] `/app/folders/page.tsx` - Handle permissions in UI
- [ ] `/app/notebooks/[id]/page.tsx` - Show permission-based controls
- [ ] `/app/shared-with-me/page.tsx` - Use proper shared resources view

### UI Components

- [ ] `/components/cards/FolderCard.tsx` - Add permission indicators
- [ ] `/components/cards/NotebookCard.tsx` - Add permission indicators
- [ ] `/components/ShareButton.tsx` - Restore and update
- [ ] `/components/ShareDialog.tsx` - Restore and update
- [ ] `/components/SharedIndicator.tsx` - Restore and update

## Testing Plan

### Manual Testing Checklist

- [ ] User can see their own folders
- [ ] User can see folders shared with them
- [ ] User can see notebooks in shared folders
- [ ] User can see orphaned shared notebooks
- [ ] Read-only users cannot edit
- [ ] Write users can edit but not share
- [ ] Owners can share and delete
- [ ] Permission changes reflect immediately

### API Testing

- [ ] Test permission denial (403 responses)
- [ ] Test cascading permissions
- [ ] Test orphaned notebook access
- [ ] Test permission revocation

## Migration Strategy

### Step 1: Fix Types (Current)

- Get build passing with accurate types
- Document all mismatches

### Step 2: Update API Routes

- One route at a time
- Test thoroughly before moving on

### Step 3: Update UI Components

- Start with read-only display
- Add interactive features gradually

### Step 4: Restore Sharing Features

- Bring back share buttons
- Test sharing workflows

## Success Criteria

1. **Build passes** with no type errors
2. **Single API call** loads all folder data
3. **Permissions properly enforced** at all levels
4. **UI reflects permissions** accurately
5. **Sharing features restored** and working

## Notes & Considerations

- Consider caching permission checks for performance
- Real-time updates when permissions change would be nice
- Need to handle offline scenarios gracefully
- Migration should be incremental, not big-bang

## Questions to Resolve

1. Should folder permissions always cascade to notebooks?
2. How to handle conflicting permissions (folder write, notebook read)?
3. Should we allow note-level sharing in the future?
4. How to handle shared folders with no notebooks?
5. What happens when owner deletes shared resource?

## Timeline Estimate

- Phase 1 (Database): 2-4 hours
- Phase 2 (API Routes): 4-6 hours
- Phase 3 (Types): 2-3 hours
- Phase 4 (UI): 4-6 hours
- Phase 5 (Edge Cases): 2-4 hours

**Total: 14-23 hours of focused work**

## Next Immediate Steps

1. Check what database functions/views already exist
2. Fix current type errors to get build passing
3. Choose one API route to refactor as proof of concept
4. Test thoroughly before proceeding with others
