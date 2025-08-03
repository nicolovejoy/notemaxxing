-- Check existing policies on share_invitations table
SELECT * FROM pg_policies WHERE tablename = 'share_invitations';

-- Create policy to allow users to read share invitations they created
CREATE POLICY "Users can read share invitations they created"
ON share_invitations FOR SELECT
USING (auth.uid() = invited_by);

-- Create policy to allow users to read invitations sent to them (by email)
CREATE POLICY "Users can read invitations sent to them"
ON share_invitations FOR SELECT
USING (
  invited_email = (
    SELECT email FROM profiles WHERE id = auth.uid()
  )
);

-- Create policy to allow authenticated users to view invitations by ID (for accepting)
CREATE POLICY "Anyone can view invitation by ID"
ON share_invitations FOR SELECT
USING (true);