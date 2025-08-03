-- Fix shared folders visibility issue
-- The existing RLS policy only allows users to see their own folders
-- We need to add a policy that allows users to see folders they have permissions for

-- Check existing policies on folders table
SELECT polname, polcmd, qual 
FROM pg_policies 
WHERE tablename = 'folders'
ORDER BY polname;

-- Create policy to allow users to view folders they have permissions for
CREATE POLICY "Users can view shared folders" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM permissions 
      WHERE resource_type = 'folder' 
      AND resource_id = folders.id 
      AND user_id = auth.uid()
    )
  );

-- Similarly for notebooks - check if policy exists
SELECT polname, polcmd, qual 
FROM pg_policies 
WHERE tablename = 'notebooks'
ORDER BY polname;

-- Create policy to allow users to view notebooks they have permissions for
CREATE POLICY "Users can view shared notebooks" ON notebooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM permissions 
      WHERE resource_type = 'notebook' 
      AND resource_id = notebooks.id 
      AND user_id = auth.uid()
    )
  );

-- Also check folder-level permissions for notebooks (inheritance)
CREATE POLICY "Users can view notebooks in shared folders" ON notebooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM permissions 
      WHERE resource_type = 'folder' 
      AND resource_id = notebooks.folder_id 
      AND user_id = auth.uid()
    )
  );

-- Verify the policies were created
SELECT polname, polcmd, qual 
FROM pg_policies 
WHERE tablename IN ('folders', 'notebooks')
AND polname LIKE '%shared%'
ORDER BY tablename, polname;