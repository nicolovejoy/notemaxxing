# Data Requirements Matrix

## Information Classes

### Core Entities

- **Folders** - Basic folder info (id, name, color)
- **Notebooks** - Basic notebook info (id, name, color, folder_id)
- **Notes** - Note content and metadata
- **User Profile** - Current user info

### Computed/Aggregate Data

- **Counts** - Note counts, notebook counts per folder
- **Recent Activity** - Last modified times, recent notebooks
- **Statistics** - Total notes, folders, storage usage

### Sharing & Permissions

- **Ownership Status** - Is this mine or shared with me?
- **Share Indicators** - Visual badge that something is shared
- **Share Recipients** - WHO it's shared with (detailed list)
- **Permission Levels** - Read/Write/Admin for each share
- **Invitations** - Pending invitations sent/received

## Data Requirements by Page

| Page                | Data Required                                                                                                                                             | Load Timing       | Caching Strategy |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------- |
| **Home Page**       |                                                                                                                                                           |                   |                  |
| - Authenticated     | • User profile<br>• Quick stats (total counts)<br>• Recent notebook ID                                                                                    | On mount          | Cache 5 min      |
| - Unauthenticated   | None (static content)                                                                                                                                     | N/A               | N/A              |
|                     |                                                                                                                                                           |                   |                  |
| **Folders Page**    |                                                                                                                                                           |                   |                  |
| - Initial Load      | • All folders (owned + shared)<br>• Notebook counts per folder<br>• Top 3-5 notebooks per folder<br>• Share indicators (badge only)<br>• Ownership status | On mount          | Cache until edit |
| - Expanded Folder   | • All notebooks in folder<br>• Note counts per notebook                                                                                                   | On expand         | Cache 5 min      |
| - Share Dialog Open | • Share recipients list<br>• Permission levels<br>• Invitation status                                                                                     | On dialog open    | No cache         |
|                     |                                                                                                                                                           |                   |                  |
| **Notebook Page**   |                                                                                                                                                           |                   |                  |
| - Initial Load      | • Notebook metadata<br>• Folder context<br>• Ownership status<br>• Permission level<br>• Share indicator                                                  | On mount          | Cache until edit |
| - Notes List        | • Notes (paginated)<br>• Search/filter state                                                                                                              | On mount + scroll | Cache until edit |
| - Share Dialog      | • Share recipients<br>• Permissions                                                                                                                       | On dialog open    | No cache         |
|                     |                                                                                                                                                           |                   |                  |
| **Shared With Me**  |                                                                                                                                                           |                   |                  |
| - Initial Load      | • Shared folders<br>• Shared notebooks<br>• Sharer info<br>• Permission levels<br>• Orphaned notebooks                                                    | On mount          | Cache 5 min      |

## Progressive Loading Strategy

### Level 1: Critical (Blocking)

**Must load before page is interactive**

- Basic entity data (folders/notebooks)
- Ownership status
- Current user permissions

### Level 2: Enhanced (Non-blocking)

**Load after initial render**

- Counts and statistics
- Share indicators
- Recent activity

### Level 3: On-Demand

**Load only when requested**

- Share recipient lists
- Detailed permissions
- Invitation details
- Audit history

## API Design Recommendations

### 1. Folders View Endpoint

```typescript
GET /api/views/folders
Returns: {
  folders: [{
    id, name, color,
    notebook_count,
    owned_by_me: boolean,
    shared_with_me: boolean,
    shared_by_me: boolean,  // Just indicator, not details
    permission_level?: 'read' | 'write' | 'admin',
    top_notebooks: [{ id, name, color, note_count }]  // First 5
  }],
  stats: { total_folders, total_notebooks, total_notes }
}
```

### 2. Share Details Endpoint (Separate)

```typescript
GET /api/shares/details?resource_id=xxx&resource_type=folder
Returns: {
  recipients: [{
    user_id, email, name,
    permission_level,
    shared_at,
    invited_by
  }],
  invitations: [{
    email,
    permission_level,
    expires_at,
    status
  }]
}
```

### 3. Notebook View Endpoint

```typescript
GET /api/views/notebooks/[id]/notes
Returns: {
  notebook: {
    id, name, color,
    folder: { id, name, color },
    owned_by_me: boolean,
    permission_level?: string,
    shared_indicator: boolean
  },
  notes: [...],  // Paginated
  siblings: [...]  // Other notebooks in folder
}
```

## Implementation Approach

### For Folders Page Scenario

**Initial Load:**

1. Fetch folders with counts and share indicators
2. Include top 3-5 notebooks per folder
3. Show share badges (not details)

**Progressive Enhancement:**

```typescript
// After initial render
useEffect(() => {
  // Preload share details for folders marked as shared
  prefetchShareDetailsForSharedFolders()
}, [folders])
```

**On-Demand:**

```typescript
// When user clicks share button/badge
const handleShareClick = async (folderId) => {
  const details = await fetchShareDetails(folderId)
  openShareDialog(details)
}
```

## Benefits of This Approach

1. **Fast Initial Load**
   - Only load what's visible
   - Share indicators without full details
   - Counts without full lists

2. **Progressive Enhancement**
   - Preload likely interactions
   - Cache expensive queries
   - Background fetch non-critical data

3. **Clear Separation**
   - View data vs. action data
   - Public info vs. private details
   - Cached vs. fresh data

## Cache Invalidation Rules

| Action            | Invalidates                     |
| ----------------- | ------------------------------- |
| Create folder     | Folders view, stats             |
| Delete folder     | Folders view, stats, notebooks  |
| Share folder      | Share indicators, share details |
| Create notebook   | Folder counts, notebook list    |
| Create note       | Notebook counts, note list      |
| Accept invitation | Folders view, shared with me    |

## Migration Path

### Phase 1: Current State

- Everything loads upfront
- Multiple redundant calls
- No progressive loading

### Phase 2: Separate Concerns (Recommended First Step)

- Remove global initialization
- Each view loads its data
- Add share details endpoint

### Phase 3: Optimize

- Add caching layer
- Implement prefetching
- Progressive enhancement

### Phase 4: Advanced

- Real-time updates for shares
- Optimistic updates
- Background sync
