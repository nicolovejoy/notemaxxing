# Generic CRUD Implementation Plan

## Goal

Reduce ~350 lines in `supabase-helpers.ts` by extracting common patterns

## Current Duplication

- `foldersApi`: ~135 lines
- `notebooksApi`: ~170 lines
- `notesApi`: ~190 lines
- Each has nearly identical: getAll, create, update, delete

## Implementation Steps

### 1. Create Generic CRUD Factory (30 min)

```typescript
// lib/store/crud-factory.ts
function createCrudApi<T>(
  tableName: string,
  options?: {
    orderBy?: string
    includeSharing?: boolean
    customQueries?: Record<string, Function>
  }
) {
  return {
    getAll: async (queryOptions) => {
      /* generic */
    },
    create: async (data) => {
      /* generic */
    },
    update: async (id, data) => {
      /* generic */
    },
    delete: async (id) => {
      /* generic */
    },
  }
}
```

### 2. Extract Sharing Logic (45 min)

```typescript
// lib/store/sharing-helpers.ts
async function withSharing(items, resourceType, userId) {
  // Extract lines 49-161 pattern
  // Returns items with sharing metadata
}
```

### 3. Refactor Each API (45 min)

```typescript
// Before: 135 lines
export const foldersApi = {
  /* huge implementation */
}

// After: ~10 lines
export const foldersApi = {
  ...createCrudApi<Folder>('folders', {
    orderBy: 'created_at',
    includeSharing: true,
  }),
}
```

### 4. Handle Special Cases

- `notebooks`: Add `archive()` method
- `notes`: Add `getByNotebook()` method

## Expected Results

- **Before**: 495 lines
- **After**: ~150 lines
- **Reduction**: ~350 lines (70%)

## Testing Checklist

- [ ] All CRUD operations work
- [ ] Sharing metadata loads correctly
- [ ] Archive/restore works for notebooks
- [ ] Notes by notebook query works
- [ ] Error handling preserved
