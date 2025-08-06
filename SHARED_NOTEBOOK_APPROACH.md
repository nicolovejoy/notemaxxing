# Shared Notebook Parent Folder Access

## Current State

- When sharing a notebook directly (without sharing parent folder), recipient can't see it in UI
- Notebooks table has RLS policy allowing access to shared notebooks
- Folders table has RLS policy that only allows access to:
  - User's own folders
  - Folders explicitly shared via permissions table
- No permission exists for parent folders of shared notebooks

## Problem

- User B has permission to see shared notebook
- User B does NOT have permission to see parent folder
- RLS blocks folder fetch → notebook has nowhere to appear in UI

## Intended Approach

### Option 1: Database Function (Recommended)

Create a database function that checks if user has access to any notebooks in a folder:

```sql
CREATE OR REPLACE FUNCTION user_can_see_folder(folder_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- User owns the folder
    SELECT 1 FROM folders WHERE id = folder_id AND user_id = user_id
    UNION
    -- User has explicit folder permission
    SELECT 1 FROM permissions
    WHERE resource_type = 'folder' AND resource_id = folder_id AND user_id = user_id
    UNION
    -- User has permission to a notebook in this folder
    SELECT 1 FROM notebooks n
    JOIN permissions p ON p.resource_id = n.id
    WHERE n.folder_id = folder_id
    AND p.resource_type = 'notebook'
    AND p.user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then update folders RLS policy to use this function.

### Option 2: Client-Side Virtual Folders

Current attempt - fetch folders client-side after checking notebook permissions.
**Issue**: RLS blocks the folder fetch, so this doesn't work.

### Option 3: Share Folder Automatically

When sharing a notebook, automatically create read-only folder permission.
**Issue**: May grant more access than intended.

## Recommendation

Implement Option 1 - database function that allows viewing folders containing shared notebooks.
