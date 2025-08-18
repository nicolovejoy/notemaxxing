# Permissions Architecture Analysis

## Current State

### Permission Queries Locations

#### 1. API Routes That Query Permissions Table

**Folder/Notebook Access Checks:**

- `/api/views/folders` - Checks folder permissions (lines 25, 164)
- `/api/views/notebooks/[notebookId]/notes` - Checks notebook permissions (lines 66, 78)
- `/api/views/notebooks/[notebookId]/notes/[noteId]` - Checks note access via notebook (line 45)

**Sharing Management:**

- `/api/shares/list` - Lists shared resources (lines 41, 49)
- `/api/shares/accept` - Accepts invitations (line 69) V
- `/api/shares/revoke` - Revokes permissions (lines 33, 90)
- `/api/shares/generate-link` - Checks if folder is shared before allowing notebook share (line 101)
- `/api/permissions/resource-permissions` - Gets permissions for a resource (line 30)

### Frontend Permission Usage

#### 1. Components Using Permission Data

**Display Components:**

- `SharedIndicator` - Shows sharing badges
- `NotebookCard` - Shows share button conditionally based on permissions
- `ShareDialog` - Manages sharing UI

**Page Components:**

- `app/backpack/page.tsx` - Shows folders with sharing indicators
- `app/folders/[id]/page.tsx` - Checks if folder is shared to show notebook share buttons
- `app/notebooks/[id]/page.tsx` - Checks permissions for edit/add note buttons
- `app/shared-with-me/page.tsx` - Shows shared resources
- `app/share/[id]/page.tsx` - Handles invitation acceptance

### Current Problems

1. **Multiple Redundant Queries**
   - Each API endpoint queries permissions independently
   - No central cache of permission data
   - Example: `/api/views/folders` queries permissions twice (for folders and notebooks)

2. **Inconsistent Permission Checks**
   - Some places check `owner_id` directly
   - Others query the permissions table
   - Mixed patterns for determining "sharedByMe" vs "sharedWithMe"

3. **No Real-time Updates**
   - When permissions change, UI doesn't update until refresh
   - No subscription to permission changes

4. **Performance Issues**
   - Each navigation potentially triggers new permission queries
   - No batching of permission checks

## Proposed Architecture

### Follow ViewStore Pattern

Instead of a separate permission store, embed permissions in existing view data:

### 1. Enhance View APIs

**`/api/views/folders`** should return:

```typescript
{
  folders: [
    {
      id,
      name,
      color,
      owner_id, // Already has this
      sharedByMe: boolean, // NEW: true if I shared this folder
      sharedWithMe: boolean, // NEW: true if shared with me
      permission: 'owner' | 'read' | 'write',
    },
  ]
}
```

**Implementation:**

```sql
-- Single additional query in folders API
SELECT resource_id FROM permissions
WHERE granted_by = userId
AND resource_type = 'folder'
```

### 2. Update Components

Components use view data directly:

```typescript
// In backpack/folders pages
const folder = foldersView.folders[0]
<SharedIndicator
  sharedByMe={folder.sharedByMe}
  sharedWithMe={folder.sharedWithMe}
  permission={folder.permission}
/>
```

### 3. Real-time Updates

Add to existing `realtime-manager.ts`:

```typescript
// Subscribe to permission changes
.on('postgres_changes',
  { table: 'permissions' },
  () => refreshCurrentView()
)
```

## Implementation Plan

### Phase 1: Update APIs

1. Add `sharedByMe` query to `/api/views/folders`
2. Set flags: `sharedByMe`, `sharedWithMe`, `permission`
3. Similar updates to notebook/note APIs

### Phase 2: Update Components

1. Use the new flags from view data
2. Remove redundant permission checks
3. SharedIndicator already supports these props

### Phase 3: Real-time

1. Add permission subscription to realtime-manager
2. Refresh view on permission changes

## Benefits

1. **Consistency**: Follows existing ViewStore pattern
2. **Simplicity**: No new stores or patterns to learn
3. **Performance**: One extra query per API, cached by React Query
4. **Real-time**: Leverages existing realtime infrastructure
