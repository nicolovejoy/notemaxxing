-- Add RLS policies for shared folders and notebooks
-- Run this to fix the issue where shared folders don't appear

-- Policy for shared folders
CREATE POLICY "Users can view shared folders" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM permissions 
      WHERE resource_type = 'folder' 
      AND resource_id = folders.id 
      AND user_id = auth.uid()
    )
  );

-- Policy for shared notebooks
CREATE POLICY "Users can view shared notebooks" ON notebooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM permissions 
      WHERE resource_type = 'notebook' 
      AND resource_id = notebooks.id 
      AND user_id = auth.uid()
    )
  );

-- Policy for notebooks in shared folders (inheritance)
CREATE POLICY "Users can view notebooks in shared folders" ON notebooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM permissions 
      WHERE resource_type = 'folder' 
      AND resource_id = notebooks.folder_id 
      AND user_id = auth.uid()
    )
  );