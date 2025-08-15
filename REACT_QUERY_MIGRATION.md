# React Query Migration - Handoff Document

## What Was Done

### 1. ✅ Permission System Overhaul

- Created ownership, permissions, and audit tables in database
- Implemented permission levels (none, read, write, admin)
- Fixed all RLS policies for invitations table
- Updated API routes to use new permission system
- Removed Edge Function dependency

### 2. ✅ React Query Setup

- Installed `@tanstack/react-query` v5.85.3
- Created query client configuration
- Set up providers
- Created comprehensive hooks library

### 3. 📝 Architecture Analysis

- Identified triple-loading problem (StoreProvider + Home + Folders)
- Created DATA_REQUIREMENTS_MATRIX.md showing what data each page needs
- Recommended View-Only Loading pattern (Option A)

## Current State

### Files Created

- `/lib/query/query-client.ts` - React Query configuration
- `/app/providers.tsx` - Query provider wrapper
- `/lib/query/hooks.ts` - All API hooks ready to use
- `/DATA_REQUIREMENTS_MATRIX.md` - Data architecture guide

### Ready to Use Hooks

```typescript
// Fetching
useFoldersView() // Get all folders with stats
useNotebookView(id) // Get notebook with notes

// Mutations
useCreateFolder() // Create and auto-navigate
useUpdateFolder() // Update and invalidate cache
useDeleteFolder() // Delete and redirect
useCreateNote() // Create and refresh notebook
useUpdateNote() // Update and refresh
useDeleteNote() // Delete and refresh
```

## Next Steps (Priority Order)

### 1. Migrate Home Page

```typescript
// app/page.tsx
import { useFoldersView } from '@/lib/query/hooks'

function HomePage() {
  const { data, isLoading } = useFoldersView()

  if (isLoading) return <Skeleton />
  // No useEffect needed! No infinite loops possible!
  return <Dashboard stats={data.stats} />
}
```

### 2. Migrate Folders Page

```typescript
// app/folders/page.tsx
import { useFoldersView } from '@/lib/query/hooks'

function FoldersPage() {
  const { data, isLoading } = useFoldersView()

  // Data is cached from home page!
  if (isLoading) return <Skeleton />
  return <FolderGrid folders={data.folders} />
}
```

### 3. Remove StoreProvider Initialization

```typescript
// lib/store/StoreProvider.tsx - Line 43
// COMMENT OUT: await dataManager.initialize()
```

### 4. Migrate Notebook Page

- Replace `loadNoteView` with `useNotebookView`
- Use mutations for create/update/delete

### 5. Add Optimistic Updates (Optional)

```typescript
const createNote = useCreateNote()

// Optimistic update example
createNote.mutate(newNote, {
  onMutate: async (newNote) => {
    // Update UI immediately
    await queryClient.cancelQueries(['notebook-view'])
    const previous = queryClient.getQueryData(['notebook-view'])
    queryClient.setQueryData(['notebook-view'], (old) => ({
      ...old,
      notes: [...old.notes, newNote],
    }))
    return { previous }
  },
  onError: (err, newNote, context) => {
    // Rollback on error
    queryClient.setQueryData(['notebook-view'], context.previous)
  },
})
```

## Why React Query Solves Everything

### Before (Infinite Loop Risk)

```typescript
useEffect(() => {
  fetchData() // When does this run?
}, [dependency]) // What dependency? Will it loop?
```

### After (No Loops Possible)

```typescript
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
})
// That's it. React Query handles everything.
```

## Benefits You Get Immediately

1. **No Infinite Loops** - React Query manages all fetching
2. **Automatic Caching** - Folders fetched once, used everywhere
3. **Background Refetching** - Stale data updates automatically
4. **Request Deduplication** - Multiple components, one fetch
5. **Loading States** - Built-in isLoading, isError, isSuccess
6. **Optimistic Updates** - Instant UI updates
7. **DevTools** - See all queries in browser

## Testing Instructions

1. **Test No Triple Loading**
   - Open Network tab
   - Navigate Home → Folders → Home
   - Should see `/api/views/folders` called ONCE

2. **Test Cache Invalidation**
   - Create a folder
   - Should auto-refresh folder list
   - Should navigate to new folder

3. **Test No Infinite Loops**
   - Open any page with data
   - Check console - no repeated fetches
   - Check Network - no request spam

## Common Patterns

### Dependent Queries

```typescript
const { data: user } = useUser()
const { data: folders } = useFolders(user?.id, {
  enabled: !!user?.id, // Only fetch when user is loaded
})
```

### Polling

```typescript
useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  refetchInterval: 30000, // Poll every 30 seconds
})
```

### Prefetching

```typescript
// Prefetch on hover for instant navigation
onMouseEnter={() => {
  queryClient.prefetchQuery({
    queryKey: ['notebook', notebookId],
    queryFn: () => fetchNotebook(notebookId)
  })
}}
```

## Troubleshooting

**If you see duplicate fetches:**

- Check if StoreProvider.initialize() is still running
- Check for multiple components using same query (this is OK, React Query dedupes)

**If data doesn't update:**

- Check cache invalidation in mutations
- Check staleTime settings (might be too long)

**If you get hydration errors:**

- Ensure Providers wraps everything
- Check for client-only hooks in SSR components

## Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Practical React Query](https://tkdodo.eu/blog/practical-react-query)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)

## Contact Previous Session

This session focused on backend permissions and React Query setup.
Key decisions:

- Chose View-Only Loading over Global Store
- Implemented granular permission system
- Set up React Query to prevent infinite loops

Ready for next session to complete the migration!
