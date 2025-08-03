-- Drop the policy that references auth.users
DROP POLICY IF EXISTS "Users can view invitations to their email" ON share_invitations;

-- Recreate it using profiles table instead
CREATE POLICY "Users can view invitations to their email"
ON share_invitations FOR SELECT
USING (
  invited_email = (
    SELECT email FROM profiles WHERE id = auth.uid()
  )
);