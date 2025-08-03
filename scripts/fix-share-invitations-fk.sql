-- Fix share_invitations foreign key issue
-- The auth.users table cannot be directly referenced in Supabase

-- Drop the existing foreign key constraint
ALTER TABLE share_invitations 
DROP CONSTRAINT IF EXISTS share_invitations_invited_by_fkey;

-- Also drop the constraint on permissions table if it exists
ALTER TABLE permissions 
DROP CONSTRAINT IF EXISTS permissions_granted_by_fkey;

-- Note: We keep the user_id columns but without foreign key constraints
-- RLS policies will still ensure data integrity