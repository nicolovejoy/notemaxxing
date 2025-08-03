# Store Migration Guide

This guide explains how to migrate from the old monolithic store to the new separated store architecture.

## Key Changes

### 1. Separated Data and UI State

- **Data Store**: Entity data (folders, notebooks, notes) with Maps for O(1) lookup
- **UI Store**: UI preferences (selectedFolder, sort options, etc.)
- **Data Manager**: Handles all API operations and optimistic updates

### 2. Smart Loading Strategy

- Metadata loads upfront (folders, notebooks, share data)
- Content loads on demand (notes load when notebook selected)
- Share metadata included in initial load

### 3. External State Management

- Stores exist outside React lifecycle
- No more store initialization in components
- StoreProvider handles auth and initialization

## Migration Steps

### For Simple Data Access

Old:

```typescript
import { useFolder, useNotebooks } from '@/lib/store/hooks'

const folder = useFolder(folderId)
const { notebooks, loading } = useNotebooks(folderId)
```

New (direct):

```typescript
import { useFolder, useNotebooks } from '@/lib/store/hooks'
// Same API, works without changes
```

New (recommended):

```typescript
import { useFolder, useNotebooksInFolder } from '@/lib/store/hooks/index'

const folder = useFolder(folderId)
const notebooks = useNotebooksInFolder(folderId)
```

### For Actions

Old:

```typescript
import { useFolderActions } from '@/lib/store/hooks'

const { createFolder } = useFolderActions()
await createFolder(name, color)
```

New (direct):

```typescript
import { useDataActions } from '@/lib/store/hooks/index'

const { createFolder } = useDataActions()
await createFolder(name, color)
```

### For UI State

Old:

```typescript
import { useSelectedFolder } from '@/lib/store/hooks'

const { selectedFolderId, setSelectedFolder } = useSelectedFolder()
```

New:

```typescript
import { useSelectedFolderId, useUIActions } from '@/lib/store/hooks/index'

const selectedFolderId = useSelectedFolderId()
const { setSelectedFolder } = useUIActions()
```

## Benefits of Migration

1. **Better Performance**
   - O(1) entity lookups with Maps
   - Lazy loading of content
   - Reduced re-renders

2. **Cleaner Architecture**
   - Clear separation of concerns
   - External state management
   - Easier testing

3. **Share Support**
   - Share metadata loads with initial data
   - No separate API calls per dialog

## Gradual Migration

The old hooks are maintained for backward compatibility through `legacy-hooks.ts`. You can migrate components gradually:

1. Start with leaf components (smallest first)
2. Update to use new hooks directly
3. Test thoroughly
4. Remove legacy imports

## Breaking Changes

1. `setSyncError` is deprecated (handled internally)
2. `optimisticUpdates` no longer exposed (handled by DataManager)
3. Quiz functionality temporarily disabled (needs implementation)

## Need Help?

Check the examples in `/lib/store/hooks/index.ts` for all available hooks and their usage.
