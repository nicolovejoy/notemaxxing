-- Proper fix for sharing that avoids infinite recursion
-- Run AFTER reverting the broken policies

-- Create a security definer function that checks permissions without RLS
CREATE OR REPLACE FUNCTION check_resource_permission(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Owner always has access
  IF p_resource_type = 'folder' THEN
    IF EXISTS (SELECT 1 FROM folders WHERE id = p_resource_id AND user_id = p_user_id) THEN
      RETURN TRUE;
    END IF;
  ELSIF p_resource_type = 'notebook' THEN
    IF EXISTS (SELECT 1 FROM notebooks WHERE id = p_resource_id AND user_id = p_user_id) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Check permissions table
  RETURN EXISTS (
    SELECT 1 FROM permissions 
    WHERE resource_type = p_resource_type 
    AND resource_id = p_resource_id 
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now update policies to use the function
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
CREATE POLICY "Users can view folders with permission" ON folders
  FOR SELECT USING (
    auth.uid() = user_id 
    OR is_admin()
    OR check_resource_permission(auth.uid(), 'folder', id)
  );

DROP POLICY IF EXISTS "Users can view own notebooks" ON notebooks;
CREATE POLICY "Users can view notebooks with permission" ON notebooks
  FOR SELECT USING (
    auth.uid() = user_id 
    OR is_admin()
    OR check_resource_permission(auth.uid(), 'notebook', id)
    OR check_resource_permission(auth.uid(), 'folder', folder_id)
  );

DROP POLICY IF EXISTS "Users can view own notes" ON notes;
CREATE POLICY "Users can view notes with permission" ON notes
  FOR SELECT USING (
    auth.uid() = user_id 
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM notebooks n
      WHERE n.id = notes.notebook_id
      AND (
        n.user_id = auth.uid()
        OR check_resource_permission(auth.uid(), 'notebook', n.id)
        OR check_resource_permission(auth.uid(), 'folder', n.folder_id)
      )
    )
  );

-- Update policies for write permissions
DROP POLICY IF EXISTS "Users can update own folders" ON folders;
CREATE POLICY "Users can update folders with write permission" ON folders
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR (
      check_resource_permission(auth.uid(), 'folder', id)
      AND EXISTS (
        SELECT 1 FROM permissions 
        WHERE resource_id = folders.id 
        AND resource_type = 'folder'
        AND user_id = auth.uid()
        AND permission = 'write'
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own notebooks" ON notebooks;
CREATE POLICY "Users can update notebooks with write permission" ON notebooks
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR (
      (check_resource_permission(auth.uid(), 'notebook', id) 
       OR check_resource_permission(auth.uid(), 'folder', folder_id))
      AND EXISTS (
        SELECT 1 FROM permissions 
        WHERE ((resource_id = notebooks.id AND resource_type = 'notebook')
               OR (resource_id = notebooks.folder_id AND resource_type = 'folder'))
        AND user_id = auth.uid()
        AND permission = 'write'
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update notes with write permission" ON notes
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM notebooks n
      WHERE n.id = notes.notebook_id
      AND (
        n.user_id = auth.uid()
        OR (
          (check_resource_permission(auth.uid(), 'notebook', n.id)
           OR check_resource_permission(auth.uid(), 'folder', n.folder_id))
          AND EXISTS (
            SELECT 1 FROM permissions 
            WHERE ((resource_id = n.id AND resource_type = 'notebook')
                   OR (resource_id = n.folder_id AND resource_type = 'folder'))
            AND user_id = auth.uid()
            AND permission = 'write'
          )
        )
      )
    )
  );