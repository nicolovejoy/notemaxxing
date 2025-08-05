-- Fix permissions table insert policy
-- The accept invitation flow needs to insert into permissions table

-- Add policy to allow users to create permissions when accepting invitations
CREATE POLICY "Users can create permissions when accepting invitations" ON permissions
  FOR INSERT WITH CHECK (
    -- User is creating a permission for themselves
    auth.uid() = user_id
    -- And there's a valid invitation for this resource
    AND EXISTS (
      SELECT 1 FROM share_invitations
      WHERE resource_type = permissions.resource_type
      AND resource_id = permissions.resource_id
      AND (
        -- Email-based invitation
        invited_email IN (
          SELECT email FROM profiles WHERE id = auth.uid()
        )
        -- OR link-based invitation (public link)
        OR invited_email = 'link@share.notemaxxing'
      )
      AND accepted_at IS NULL
      AND expires_at > NOW()
    )
  );

-- Verify the policy was created
DO $$
BEGIN
    RAISE NOTICE 'Permission insert policy created successfully!';
    RAISE NOTICE 'Users can now accept share invitations.';
END $$;