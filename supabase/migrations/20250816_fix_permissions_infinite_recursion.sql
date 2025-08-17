-- Fix infinite recursion in permissions RLS policies
-- The issue: RLS policies call has_permission() which queries permissions table, causing infinite loop

-- Drop the problematic RLS policies that cause recursion
DROP POLICY IF EXISTS "Users can view permissions they admin" ON permissions;
DROP POLICY IF EXISTS "Only admins can modify permissions" ON permissions;
DROP POLICY IF EXISTS "Users can view relevant permissions" ON permissions;

-- Create simpler RLS policies that don't call has_permission()
-- These policies avoid the circular dependency

-- Users can see permissions where they are the user, or they granted it, or they own the resource
CREATE POLICY "Users can view their permissions or permissions they granted"
ON permissions FOR SELECT
USING (
    user_id = auth.uid() 
    OR granted_by = auth.uid()
    OR resource_id IN (
        SELECT id FROM folders WHERE user_id = auth.uid()
        UNION ALL
        SELECT id FROM notebooks WHERE user_id = auth.uid()
    )
);

-- For INSERT, rely on database functions (create_invitation, accept_invitation)
-- No direct INSERT policy needed since functions handle this

-- Users can only delete permissions they granted
CREATE POLICY "Users can delete permissions they granted"
ON permissions FOR DELETE
USING (granted_by = auth.uid());

-- For UPDATE, users can only update permissions they granted
CREATE POLICY "Users can update permissions they granted"
ON permissions FOR UPDATE
USING (granted_by = auth.uid())
WITH CHECK (granted_by = auth.uid());