# Recent Changes - January 2025

## Data Refresh Issues (FIXED)

### Changes Made

1. Added `refresh()` method to DataManager (`/lib/store/data-manager.ts`)
2. Call `dataManager.refresh()` after successful login (`/app/auth/login/page.tsx`)
3. Call `dataManager.refresh()` after accepting share invitation (`/app/share/[id]/page.tsx`)
4. Fixed HTML validation error - nested buttons in admin console

### Result

- Users no longer need to manually refresh after login
- Shared resources appear immediately after accepting invitations

## Orphaned Shared Notebooks (FIXED)

### Problem

When a notebook is shared directly (without sharing the parent folder), recipients couldn't see it anywhere in the UI.

### Solution Implemented

1. Added `useOrphanedSharedNotebooks()` hook in `/lib/store/hooks/useDataStore.ts`
   - Returns shared notebooks where user doesn't have access to parent folder
2. Updated folders page (`/app/folders/page.tsx`)
   - Added "Shared with Me" section at bottom
   - Only shows when orphaned shared notebooks exist
   - Clicking navigates to dedicated page

3. Created `/app/shared-with-me/page.tsx`
   - Dedicated page showing all orphaned shared notebooks
   - Clean, simple UI focused on shared content

### Clean Architecture

- No virtual folders in store
- Store remains pure data
- UI handles presentation logic
- Simple, maintainable solution

## Files Modified

- `/lib/store/data-manager.ts` - Added refresh() method
- `/lib/store/hooks/useDataStore.ts` - Added useOrphanedSharedNotebooks()
- `/lib/store/types.ts` - Cleaned up Folder type
- `/app/folders/page.tsx` - Added "Shared with Me" section
- `/app/shared-with-me/page.tsx` - New dedicated page
- `/app/auth/login/page.tsx` - Added refresh after login
- `/app/share/[id]/page.tsx` - Added refresh after share acceptance
- `/components/admin-console.tsx` - Fixed nested button issue
