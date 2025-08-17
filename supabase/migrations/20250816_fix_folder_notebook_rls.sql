-- Fix RLS policies for folders and notebooks to allow shared access
-- Users should be able to read resources they have permissions for

-- Drop existing SELECT policies on folders
DROP POLICY IF EXISTS "Users can view their own folders" ON folders;
DROP POLICY IF EXISTS "folders_select_policy" ON folders;

-- Create new SELECT policy that checks both ownership and permissions
CREATE POLICY "Users can view owned or shared folders"
ON folders FOR SELECT
TO authenticated
USING (
    -- User owns the folder
    user_id = auth.uid()
    OR
    -- User has permission to access the folder
    EXISTS (
        SELECT 1 FROM permissions p
        WHERE p.resource_id = folders.id
        AND p.resource_type = 'folder'
        AND p.user_id = auth.uid()
    )
);

-- Drop existing SELECT policies on notebooks
DROP POLICY IF EXISTS "Users can view their own notebooks" ON notebooks;
DROP POLICY IF EXISTS "notebooks_select_policy" ON notebooks;

-- Create new SELECT policy that checks both ownership and permissions
CREATE POLICY "Users can view owned or shared notebooks"
ON notebooks FOR SELECT
TO authenticated
USING (
    -- User owns the notebook
    user_id = auth.uid()
    OR
    -- User has permission to access the notebook
    EXISTS (
        SELECT 1 FROM permissions p
        WHERE p.resource_id = notebooks.id
        AND p.resource_type = 'notebook'
        AND p.user_id = auth.uid()
    )
    OR
    -- User has permission to access the parent folder (inherited permission)
    EXISTS (
        SELECT 1 FROM permissions p
        WHERE p.resource_id = notebooks.folder_id
        AND p.resource_type = 'folder'
        AND p.user_id = auth.uid()
    )
);

-- Also update notes to support inherited permissions
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "notes_select_policy" ON notes;

CREATE POLICY "Users can view owned or shared notes"
ON notes FOR SELECT
TO authenticated
USING (
    -- User owns the note
    user_id = auth.uid()
    OR
    -- User has permission to access the notebook
    EXISTS (
        SELECT 1 FROM permissions p
        WHERE p.resource_id = notes.notebook_id
        AND p.resource_type = 'notebook'
        AND p.user_id = auth.uid()
    )
    OR
    -- User has permission to access the folder (through notebook's folder)
    EXISTS (
        SELECT 1 FROM permissions p
        JOIN notebooks n ON n.id = notes.notebook_id
        WHERE p.resource_id = n.folder_id
        AND p.resource_type = 'folder'
        AND p.user_id = auth.uid()
    )
);