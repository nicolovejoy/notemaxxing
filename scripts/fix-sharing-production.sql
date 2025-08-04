-- Fix Production Sharing Issues
-- Run this in Supabase SQL Editor to enable sharing functionality

-- 1. Drop existing function if it exists (to handle re-runs)
DROP FUNCTION IF EXISTS has_permission(text, uuid, uuid, text);

-- Create the has_permission function that the system expects
CREATE OR REPLACE FUNCTION has_permission(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_user_id UUID,
  p_permission TEXT DEFAULT 'read'
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the resource
  IF p_resource_type = 'folder' THEN
    IF EXISTS (
      SELECT 1 FROM folders 
      WHERE id = p_resource_id AND user_id = p_user_id
    ) THEN
      RETURN TRUE;
    END IF;
  ELSIF p_resource_type = 'notebook' THEN
    IF EXISTS (
      SELECT 1 FROM notebooks 
      WHERE id = p_resource_id AND user_id = p_user_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Check permissions table for shared access
  RETURN EXISTS (
    SELECT 1 FROM permissions
    WHERE resource_type = p_resource_type
    AND resource_id = p_resource_id
    AND user_id = p_user_id
    AND (
      (p_permission = 'read' AND permission IN ('read', 'write')) OR
      (p_permission = 'write' AND permission = 'write')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing policies that don't account for sharing
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
DROP POLICY IF EXISTS "Users can view own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can view own notes" ON notes;

-- 3. Create new policies that use has_permission
CREATE POLICY "Users can view own and shared folders" ON folders
  FOR SELECT USING (
    auth.uid() = user_id OR 
    has_permission('folder', id, auth.uid(), 'read') OR
    is_admin()
  );

CREATE POLICY "Users can view own and shared notebooks" ON notebooks
  FOR SELECT USING (
    auth.uid() = user_id OR 
    has_permission('notebook', id, auth.uid(), 'read') OR
    has_permission('folder', folder_id, auth.uid(), 'read') OR
    is_admin()
  );

CREATE POLICY "Users can view notes in accessible notebooks" ON notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notebooks n
      WHERE n.id = notes.notebook_id
      AND (
        n.user_id = auth.uid() OR
        has_permission('notebook', n.id, auth.uid(), 'read') OR
        has_permission('folder', n.folder_id, auth.uid(), 'read') OR
        is_admin()
      )
    )
  );

-- 4. Fix share_invitations policies
DROP POLICY IF EXISTS "Users can view invitations they sent" ON share_invitations;
CREATE POLICY "Users can view relevant invitations" ON share_invitations
  FOR SELECT USING (
    auth.uid() = invited_by OR
    invited_email IN (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
  );

-- 5. Fix permissions policies  
DROP POLICY IF EXISTS "Users can view their permissions" ON permissions;
CREATE POLICY "Users can view relevant permissions" ON permissions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = granted_by
  );

-- 6. Add update policies for shared resources
CREATE POLICY "Users can update shared folders with write permission" ON folders
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    has_permission('folder', id, auth.uid(), 'write')
  );

CREATE POLICY "Users can update shared notebooks with write permission" ON notebooks
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    has_permission('notebook', id, auth.uid(), 'write') OR
    has_permission('folder', folder_id, auth.uid(), 'write')
  );

CREATE POLICY "Users can update notes in writable notebooks" ON notes
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM notebooks n
      WHERE n.id = notes.notebook_id
      AND (
        has_permission('notebook', n.id, auth.uid(), 'write') OR
        has_permission('folder', n.folder_id, auth.uid(), 'write')
      )
    )
  );

-- 7. Verify the setup
DO $$
DECLARE
    func_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check if has_permission function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'has_permission'
    ) INTO func_exists;
    
    -- Count sharing-related policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND (tablename IN ('folders', 'notebooks', 'notes', 'permissions', 'share_invitations'))
    AND (policyname LIKE '%shared%' OR policyname LIKE '%relevant%' OR policyname LIKE '%accessible%');
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SHARING FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'has_permission function created: %', func_exists;
    RAISE NOTICE 'Sharing policies created: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test creating a share invitation';
    RAISE NOTICE '2. Accept the invitation with another account';
    RAISE NOTICE '3. Verify shared resources appear';
    RAISE NOTICE '========================================';
END $$;