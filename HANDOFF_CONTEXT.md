# Handoff Context - Sharing System Complete

## Current Status (January 2025)

### ✅ Sharing System Working

- Email-based invitations with 7-day expiry
- Folder and notebook sharing with permission inheritance
- Read/write permission levels
- "Shared by you" indicators for owners
- Proper UI handling for read-only users

### ✅ Clean Zustand Store Implementation

1. All pages use the new clean store API
2. No compatibility layers or wrappers
3. All data loaded upfront for instant access
4. Full-text search works across all content
5. Hooks return raw data (arrays, not wrapper objects)

## Architecture

### Store System

- `/lib/store/data-store.ts` - Data store with Maps for O(1) lookups
- `/lib/store/ui-store.ts` - UI state management
- `/lib/store/data-manager.ts` - Handles all API operations
- `/lib/store/hooks/` - Clean hooks that return raw data

### Sharing System

- `/api/shares/*` - API routes for sharing operations
- `ShareButton`, `ShareDialog`, `SharedIndicator` - UI components
- Email-specific invitations (not public links)
- `has_permission()` database function for access control

## Hook API Reference

```typescript
// Data hooks - return arrays directly
useFolders() => Folder[]
useNotebooks(includeArchived?) => Notebook[]
useNotes() => Note[]
useNotesInNotebook(notebookId) => Note[]

// Single item hooks - return item or undefined
useFolder(id) => Folder | undefined
useNotebook(id) => Notebook | undefined
useNote(id) => Note | undefined

// Action hooks
useDataActions() => { createFolder, updateFolder, deleteFolder, ... }
useUIActions() => store instance with all UI actions

// State hooks
useSyncState() => { status: 'idle' | 'loading' | 'error', error, lastSyncTime }
```

## Recent Fixes (January 2025)

### Sharing System Implementation

- Added `has_permission` function and RLS policies to database
- Fixed folder/notebook rename bug (wasn't using InlineEdit value)
- Added proper UI permission handling (read-only users don't see edit buttons)
- Implemented "Shared by you" indicators for resource owners
- Fixed duplicate invitation handling
- Fixed TypeScript/build errors in unrelated files

## Known Issues

### UI/UX Issues

- **Nested Button HTML Error**: Admin Console has buttons inside buttons (~lines 528-536, 578-586)
- **Folder Card UI**: Icons overlap with title text
- **Accept Invitation Page**: Shows "unnamed folder" instead of actual resource name
- **No Real-time Sync**: Changes require manual refresh to appear in other accounts
- **Login/Share Refresh**: Need to refresh after login or accepting invitations

### Notebook Management Clarification

- **Archive**: Soft delete - moves notebook to archived state (available on regular notebooks)
- **Delete**: Hard delete - permanently removes notebook (only on archived notebooks)
- **Restore**: Unarchive - returns notebook to regular state
- **View Archived**: Use "Show archived" toggle on folders page

## Next Steps

1. **Continue testing sharing**:
   - Test notebook-specific sharing
   - Test revoke access functionality
2. **Fix remaining UI issues**:
   - Fix refresh issues after login/share accept
   - Add real-time sync for shared resources
   - Fix overlapping icons in folder cards

## SQL to Run (if not done)

```sql
-- Add RLS policies for shared folders
CREATE POLICY "Users can view shared folders" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM permissions
      WHERE resource_type = 'folder'
      AND resource_id = folders.id
      AND user_id = auth.uid()
    )
  );
```

## Remaining Tasks

### High Priority

1. **Data refresh issues** - Need manual refresh after login/accepting invitations
2. **Accept invitation page** - Shows "unnamed folder" instead of resource name
3. **Test notebook sharing** - Direct notebook shares (not via folder)
4. **Test revoke access** - Ensure permissions are properly removed

### Medium Priority

1. **Real-time sync** - Changes don't appear in other accounts without refresh
2. **Folder card UI** - Icons overlap with title text
3. **Create note button** - Add on notebooks page for easier note creation

### Low Priority

1. **Auto-focus cursor** - Focus in note editor when opening
2. **Admin console** - Fix nested button HTML warnings

## Testing Checklist

- [x] Folders page loads without errors
- [x] Share button visible on own folders
- [x] Can create share invitation
- [x] Invitation accepted creates permission record
- [x] Shared folders appear for recipient
- [x] "Shared by you" indicator shows for owners
- [x] Read-only permissions properly disable edit UI
- [ ] Direct notebook sharing works
- [ ] Revoke access removes permissions
