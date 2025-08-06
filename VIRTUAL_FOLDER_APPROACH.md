# Virtual "Shared with Me" Folder Approach

## How It Works

1. **Data Loading**: Keep current loading logic - notebooks know if they're shared
2. **Virtual Folder Creation**: In `useFolders()` hook, inject a virtual folder when:
   - User has shared notebooks
   - Those notebooks' parent folders are NOT shared with user
3. **Virtual Folder Properties**:
   ```typescript
   {
     id: 'shared-with-me-virtual',
     name: 'Shared with Me',
     color: 'bg-purple-500',
     virtual: true,
     user_id: currentUserId,
     created_at: new Date().toISOString(),
     updated_at: new Date().toISOString()
   }
   ```

## Implementation Points

1. **useFolders()**: Check for orphaned shared notebooks, inject virtual folder if needed
2. **useNotebooksInFolder()**: When folderId is 'shared-with-me-virtual', return orphaned shared notebooks
3. **UI**: Virtual folder can't be edited/deleted/shared
4. **Navigation**: Works normally - clicking takes you to notebook list

## Fail-safes to Prevent Database Storage

1. **ID Format**: Use `virtual-shared-with-me` prefix that's invalid UUID
2. **API Guards**: In foldersApi, reject any operations on IDs starting with 'virtual-'
3. **DataManager Guards**: Add checks in createFolder/updateFolder/deleteFolder to reject virtual IDs
4. **Type Safety**: Add `isVirtual?: boolean` to Folder type as additional check

## Benefits

- No database changes needed
- Clean mental model
- Only appears when needed
- Uses existing folder UI components
- Clear that it's a special container
