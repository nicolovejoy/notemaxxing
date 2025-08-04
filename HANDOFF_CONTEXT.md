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

## Known Issues

### Nested Button HTML Error

- **Location**: Admin Console (`/components/admin-console.tsx`)
- **Issue**: Buttons inside collapsible section headers (which are also buttons)
- **Error**: "In HTML, <button> cannot be a descendant of <button>"
- **Lines**: ~528-536, ~578-586 (Trash and Refresh buttons inside section headers)
- **Fix needed**: Either change outer element to div or restructure UI pattern

## Next Steps

1. **Test sharing functionality**:
   - Create folder share invitation
   - Accept with other account
   - Verify permissions created
   - Check if shared folders appear
2. **Fix UI issues**:
   - Fix nested button issue in admin console
   - Test hydration errors

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
