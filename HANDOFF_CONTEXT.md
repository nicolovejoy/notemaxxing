# Handoff Context - New Store Architecture Complete

## Current Status

### Clean Zustand Store Implementation

1. ✅ All pages use the new clean store API
2. ✅ No compatibility layers or wrappers
3. ✅ All data loaded upfront for instant access
4. ✅ Full-text search works across all content
5. ✅ Hooks return raw data (arrays, not wrapper objects)

### Store Architecture

- Data and UI concerns separated into different stores
- Clean hook API with predictable returns
- Optimistic updates for better UX
- Ready for real-time sync when needed

## Key Files

- `/lib/store/data-store.ts` - Data store with Maps for O(1) lookups
- `/lib/store/ui-store.ts` - UI state management
- `/lib/store/data-manager.ts` - Handles all API operations
- `/lib/store/hooks/` - Clean hooks that return raw data

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

## Recent Fixes (August 2025)

### Sharing System Fixed

- Added `has_permission` function to database
- Fixed RLS policies for shared resources
- Fixed folder/notebook rename bug (wasn't using InlineEdit value)
- Added proper UI permission handling (read-only users don't see edit buttons)
- Shared resources now show permission indicators

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

## Testing Checklist

- [ ] Folders page loads without errors
- [ ] Share button visible on own folders
- [ ] Can create share invitation
- [ ] Invitation accepted creates permission record
- [ ] Shared folders appear for recipient
