-- Fix for sharing system: Grant SELECT on auth.users for foreign key validation
-- This fixes the "permission denied for table users" error when creating invitations

-- Grant authenticated users ability to see basic user info needed for:
-- 1. Foreign key validation (invitations.invited_by -> auth.users.id)
-- 2. RLS policies that check user email
GRANT SELECT (id, email) ON auth.users TO authenticated;

-- Note: This is a minimal grant - only the columns needed for the sharing system