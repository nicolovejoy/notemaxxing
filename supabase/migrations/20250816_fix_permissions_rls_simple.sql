-- Simple fix: Update RLS policy so owners can see who they've shared with

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own permissions" ON permissions;

-- Create new policy that allows users to see:
-- 1. Permissions where they are the recipient (user_id = auth.uid())
-- 2. Permissions for resources they own
CREATE POLICY "Users can view relevant permissions" ON permissions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  resource_id IN (
    SELECT id FROM folders WHERE user_id = auth.uid()
    UNION ALL
    SELECT id FROM notebooks WHERE user_id = auth.uid()
  )
);