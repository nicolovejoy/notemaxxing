-- Add RLS policies for sharing functionality
-- This script updates existing policies to include shared resources

-- ========================================
-- 1. UPDATE FOLDERS POLICIES
-- ========================================

-- Drop existing folder select policy
DROP POLICY IF EXISTS "Users can view their own folders" ON folders;

-- Create new folder select policy that includes shared folders
CREATE POLICY "Users can view owned and shared folders" ON folders
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  id IN (
    SELECT resource_id 
    FROM permissions 
    WHERE resource_type = 'folder' 
    AND user_id = auth.uid()
  )
);

-- Update folder update policy to respect permissions
DROP POLICY IF EXISTS "Users can update their own folders" ON folders;

CREATE POLICY "Users can update owned folders or shared with write permission" ON folders
FOR UPDATE USING (
  user_id = auth.uid() 
  OR 
  id IN (
    SELECT resource_id 
    FROM permissions 
    WHERE resource_type = 'folder' 
    AND user_id = auth.uid()
    AND permission = 'write'
  )
);

-- ========================================
-- 2. UPDATE NOTEBOOKS POLICIES
-- ========================================

-- Drop existing notebook select policy
DROP POLICY IF EXISTS "Users can view their own notebooks" ON notebooks;

-- Create new notebook select policy that includes shared notebooks and inherited folder permissions
CREATE POLICY "Users can view owned and shared notebooks" ON notebooks
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  id IN (
    SELECT resource_id 
    FROM permissions 
    WHERE resource_type = 'notebook' 
    AND user_id = auth.uid()
  )
  OR
  folder_id IN (
    SELECT resource_id 
    FROM permissions 
    WHERE resource_type = 'folder' 
    AND user_id = auth.uid()
  )
);

-- Update notebook update policy to respect permissions
DROP POLICY IF EXISTS "Users can update their own notebooks" ON notebooks;

CREATE POLICY "Users can update owned notebooks or shared with write permission" ON notebooks
FOR UPDATE USING (
  user_id = auth.uid() 
  OR 
  id IN (
    SELECT resource_id 
    FROM permissions 
    WHERE resource_type = 'notebook' 
    AND user_id = auth.uid()
    AND permission = 'write'
  )
  OR
  folder_id IN (
    SELECT resource_id 
    FROM permissions 
    WHERE resource_type = 'folder' 
    AND user_id = auth.uid()
    AND permission = 'write'
  )
);

-- ========================================
-- 3. UPDATE NOTES POLICIES
-- ========================================

-- Drop existing note select policy
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;

-- Create new note select policy that includes shared notebooks and inherited permissions
CREATE POLICY "Users can view owned and shared notes" ON notes
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  notebook_id IN (
    SELECT id FROM notebooks
    WHERE id IN (
      SELECT resource_id 
      FROM permissions 
      WHERE resource_type = 'notebook' 
      AND user_id = auth.uid()
    )
    OR folder_id IN (
      SELECT resource_id 
      FROM permissions 
      WHERE resource_type = 'folder' 
      AND user_id = auth.uid()
    )
  )
);

-- Update note update policy to respect permissions
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;

CREATE POLICY "Users can update owned notes or shared with write permission" ON notes
FOR UPDATE USING (
  user_id = auth.uid() 
  OR 
  notebook_id IN (
    SELECT id FROM notebooks
    WHERE id IN (
      SELECT resource_id 
      FROM permissions 
      WHERE resource_type = 'notebook' 
      AND user_id = auth.uid()
      AND permission = 'write'
    )
    OR folder_id IN (
      SELECT resource_id 
      FROM permissions 
      WHERE resource_type = 'folder' 
      AND user_id = auth.uid()
      AND permission = 'write'
    )
  )
);

-- Insert policy for notes (only in owned or writable notebooks)
DROP POLICY IF EXISTS "Users can create notes in their notebooks" ON notes;

CREATE POLICY "Users can create notes in owned or writable notebooks" ON notes
FOR INSERT WITH CHECK (
  notebook_id IN (
    SELECT id FROM notebooks
    WHERE user_id = auth.uid()
    OR id IN (
      SELECT resource_id 
      FROM permissions 
      WHERE resource_type = 'notebook' 
      AND user_id = auth.uid()
      AND permission = 'write'
    )
    OR folder_id IN (
      SELECT resource_id 
      FROM permissions 
      WHERE resource_type = 'folder' 
      AND user_id = auth.uid()
      AND permission = 'write'
    )
  )
);

-- ========================================
-- 4. PERMISSIONS TABLE POLICIES
-- ========================================

-- Drop existing permissions policies
DROP POLICY IF EXISTS "Users can view relevant permissions" ON permissions;
DROP POLICY IF EXISTS "Resource owners can grant permissions" ON permissions;
DROP POLICY IF EXISTS "Owners and users can revoke permissions" ON permissions;

-- Users can view permissions for resources they own or have access to
CREATE POLICY "Users can view relevant permissions" ON permissions
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  granted_by = auth.uid()
  OR
  (resource_type = 'folder' AND resource_id IN (
    SELECT id FROM folders WHERE user_id = auth.uid()
  ))
  OR
  (resource_type = 'notebook' AND resource_id IN (
    SELECT id FROM notebooks WHERE user_id = auth.uid()
  ))
);

-- Only resource owners can insert permissions
CREATE POLICY "Resource owners can grant permissions" ON permissions
FOR INSERT WITH CHECK (
  (resource_type = 'folder' AND resource_id IN (
    SELECT id FROM folders WHERE user_id = auth.uid()
  ))
  OR
  (resource_type = 'notebook' AND resource_id IN (
    SELECT id FROM notebooks WHERE user_id = auth.uid()
  ))
);

-- Only resource owners or the permission holder can delete permissions
CREATE POLICY "Owners and users can revoke permissions" ON permissions
FOR DELETE USING (
  user_id = auth.uid()
  OR
  granted_by = auth.uid()
  OR
  (resource_type = 'folder' AND resource_id IN (
    SELECT id FROM folders WHERE user_id = auth.uid()
  ))
  OR
  (resource_type = 'notebook' AND resource_id IN (
    SELECT id FROM notebooks WHERE user_id = auth.uid()
  ))
);

-- ========================================
-- 5. SHARE INVITATIONS POLICIES
-- ========================================

-- Drop existing share_invitations policies
DROP POLICY IF EXISTS "Users can view relevant invitations" ON share_invitations;
DROP POLICY IF EXISTS "Resource owners can create invitations" ON share_invitations;
DROP POLICY IF EXISTS "Recipients can accept invitations" ON share_invitations;
DROP POLICY IF EXISTS "Users can delete relevant invitations" ON share_invitations;

-- Users can view invitations they sent or received
CREATE POLICY "Users can view relevant invitations" ON share_invitations
FOR SELECT USING (
  invited_by = auth.uid()
  OR
  invited_email IN (
    SELECT email FROM profiles WHERE id = auth.uid()
  )
);

-- Users can create invitations for resources they own
CREATE POLICY "Resource owners can create invitations" ON share_invitations
FOR INSERT WITH CHECK (
  invited_by = auth.uid()
  AND (
    (resource_type = 'folder' AND resource_id IN (
      SELECT id FROM folders WHERE user_id = auth.uid()
    ))
    OR
    (resource_type = 'notebook' AND resource_id IN (
      SELECT id FROM notebooks WHERE user_id = auth.uid()
    ))
  )
);

-- Users can update invitations they received (to accept them)
CREATE POLICY "Recipients can accept invitations" ON share_invitations
FOR UPDATE USING (
  invited_email IN (
    SELECT email FROM profiles WHERE id = auth.uid()
  )
);

-- Inviters and recipients can delete invitations
CREATE POLICY "Users can delete relevant invitations" ON share_invitations
FOR DELETE USING (
  invited_by = auth.uid()
  OR
  invited_email IN (
    SELECT email FROM profiles WHERE id = auth.uid()
  )
);

-- ========================================
-- 6. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to check if user has access to a folder
CREATE OR REPLACE FUNCTION user_has_folder_access(folder_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM folders 
    WHERE id = folder_id AND user_id = user_id
  ) OR EXISTS (
    SELECT 1 FROM permissions 
    WHERE resource_type = 'folder' 
    AND resource_id = folder_id 
    AND user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has write access to a folder
CREATE OR REPLACE FUNCTION user_has_folder_write_access(folder_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM folders 
    WHERE id = folder_id AND user_id = user_id
  ) OR EXISTS (
    SELECT 1 FROM permissions 
    WHERE resource_type = 'folder' 
    AND resource_id = folder_id 
    AND user_id = user_id
    AND permission = 'write'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;