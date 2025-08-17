# Handoff Document - Permissions System

## What We Fixed

- ✅ Basic sharing works (User A can share folder with User B)

## Current Issues

1. **Notebook Visibility**: Folder owners can't see all notebooks in their folders
2. **No Share Indicators**: UI doesn't show `sharedByMe` or `sharedWithMe` badges
3. **User Stats Error**: Minor - `user_stats` view returns no rows (Nicholas doesn't understand this issue - please explain it to him before addressing it)

## Ownership Model (latest as of August 16th)

- **OWNER** = Inherited from container (own folder = own everything inside) or assigned to initial creator
- **CREATOR** = Who made it (track for attribution, but doesn't always mean ownership)
- **PERMISSIONS** = Access rights (read/write)

Example: If Bob creates a notebook in Alice's folder, Alice owns it but we track Bob as creator.

## Next Steps

### 1. Fix Notebook visibility

Notebooks should be visible if you own the parent folder:
may be an RLS issue

### 2. Add Share Indicators

In `/api/views/folders`, calculate:

- `sharedByMe`: I own it AND others have permissions (discuss with N what to do about open invites that are not yet accepted)
- `sharedWithMe`: I don't own it but have permissions

### 3. Add Creator Tracking

- Add `created_by` column to notebooks/notes tables (discuss a plan with N first. don't just code)
- Keep `user_id` as owner (inherited from folder (consider renaming the field? seem un-informative as a name. how hard a lift? discuss with N)
- Show "Created by X" in UI for attribution (discuss before coding)

## Key Files

- `/app/api/views/folders/route.ts` - Main API that needs share indicators
- `PERMISSION_MATRIX.md` - Simplified ownership rules
- `SHARING_ARCHITECTURE.md` - Technical design
- `FIX_RLS_NOW.sql` - The RLS fix that was applied

## Database State

- Permissions RLS is working again. may be worth a review though. ideally throug a db pull.
- One test permission exists (User A shared folder with User B)
- Functions `create_invitation()` and `accept_invitation()` work

## Testing Needed

1. Folder owner sees all notebooks (after RLS fix)
2. Share indicators appear correctly
3. Creator attribution shows in UI
4. Moving notebooks changes ownership
