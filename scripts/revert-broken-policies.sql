-- URGENT: Revert the broken policies that cause infinite recursion
-- Run this immediately to fix the app

-- Drop the broken policies
DROP POLICY IF EXISTS "Users can view folders" ON folders;
DROP POLICY IF EXISTS "Users can view notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can view notes" ON notes;
DROP POLICY IF EXISTS "Users can update folders" ON folders;
DROP POLICY IF EXISTS "Users can update notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can update notes" ON notes;

-- Restore the original working policies
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notebooks" ON notebooks
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can update own notebooks" ON notebooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);