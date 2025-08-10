-- Fix RLS policies to allow viewing shared folders and notebooks
-- This script updates the policies to check the permissions table

-- Drop existing folder policy
DROP POLICY IF EXISTS "Users can view own folders" ON folders;

-- Create new policy that checks both ownership and permissions
CREATE POLICY "Users can view folders" ON folders
  FOR SELECT USING (
    auth.uid() = user_id 
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM permissions 
      WHERE permissions.resource_id = folders.id 
      AND permissions.resource_type = 'folder'
      AND permissions.user_id = auth.uid()
    )
  );

-- Drop existing notebook policy  
DROP POLICY IF EXISTS "Users can view own notebooks" ON notebooks;

-- Create new policy that checks both ownership and permissions
CREATE POLICY "Users can view notebooks" ON notebooks
  FOR SELECT USING (
    auth.uid() = user_id 
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM permissions 
      WHERE permissions.resource_id = notebooks.id 
      AND permissions.resource_type = 'notebook'
      AND permissions.user_id = auth.uid()
    )
    -- Also allow viewing notebooks in shared folders
    OR EXISTS (
      SELECT 1 FROM permissions 
      WHERE permissions.resource_id = notebooks.folder_id 
      AND permissions.resource_type = 'folder'
      AND permissions.user_id = auth.uid()
    )
  );

-- Drop existing notes policy
DROP POLICY IF EXISTS "Users can view own notes" ON notes;

-- Create new policy that checks ownership and inherited permissions
CREATE POLICY "Users can view notes" ON notes
  FOR SELECT USING (
    auth.uid() = user_id 
    OR is_admin()
    -- Check if user has permission on the notebook
    OR EXISTS (
      SELECT 1 FROM notebooks 
      JOIN permissions ON (
        (permissions.resource_id = notebooks.id AND permissions.resource_type = 'notebook')
        OR (permissions.resource_id = notebooks.folder_id AND permissions.resource_type = 'folder')
      )
      WHERE notebooks.id = notes.notebook_id
      AND permissions.user_id = auth.uid()
    )
  );

-- Update policies should also check write permissions
DROP POLICY IF EXISTS "Users can update own folders" ON folders;
CREATE POLICY "Users can update folders" ON folders
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM permissions 
      WHERE permissions.resource_id = folders.id 
      AND permissions.resource_type = 'folder'
      AND permissions.user_id = auth.uid()
      AND permissions.permission = 'write'
    )
  );

DROP POLICY IF EXISTS "Users can update own notebooks" ON notebooks;
CREATE POLICY "Users can update notebooks" ON notebooks
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM permissions 
      WHERE (
        (permissions.resource_id = notebooks.id AND permissions.resource_type = 'notebook')
        OR (permissions.resource_id = notebooks.folder_id AND permissions.resource_type = 'folder')
      )
      AND permissions.user_id = auth.uid()
      AND permissions.permission = 'write'
    )
  );

DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update notes" ON notes
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM notebooks 
      JOIN permissions ON (
        (permissions.resource_id = notebooks.id AND permissions.resource_type = 'notebook')
        OR (permissions.resource_id = notebooks.folder_id AND permissions.resource_type = 'folder')
      )
      WHERE notebooks.id = notes.notebook_id
      AND permissions.user_id = auth.uid()
      AND permissions.permission = 'write'
    )
  );