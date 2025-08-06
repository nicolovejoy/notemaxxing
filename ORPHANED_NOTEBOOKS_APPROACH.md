# Cleaner Approach for Orphaned Shared Notebooks

## Current Issues

- Virtual folder mixed with real folders in store
- Special cases everywhere (navigation, UI, guards)
- Complexity spreading through codebase

## Better Approach: Keep Store Pure

### 1. Add Store Helper

```typescript
// In useDataStore.ts
export const useOrphanedSharedNotebooks = () => {
  const notebooks = useNotebooks()
  const folders = useFolders()

  return useMemo(() => {
    const accessibleFolderIds = new Set(folders.map((f) => f.id))
    return notebooks.filter((n) => n.shared && !accessibleFolderIds.has(n.folder_id))
  }, [notebooks, folders])
}
```

### 2. Folders Page UI

Instead of virtual folder, add a separate section:

- Regular folders grid
- Below that: "Shared with Me" section (only shows if orphaned notebooks exist)
- Clicking it goes to `/shared-with-me`

### 3. Benefits

- No virtual folders in store
- No special guards needed
- Clean data model
- UI handles presentation
