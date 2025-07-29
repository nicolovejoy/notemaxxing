-- Fix RLS Policies for Notemaxxing
-- Run this in your Supabase SQL Editor

-- First, check if RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname IN ('folders', 'notebooks', 'notes', 'quizzes');

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON folders;
DROP POLICY IF EXISTS "Users can update own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON folders;

-- Create new policies for folders
CREATE POLICY "Users can view own folders" ON folders
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON folders
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON folders
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON folders
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Enable RLS on folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Repeat for notebooks
DROP POLICY IF EXISTS "Users can view own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can insert own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can update own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can delete own notebooks" ON notebooks;

CREATE POLICY "Users can view own notebooks" ON notebooks
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notebooks" ON notebooks
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notebooks" ON notebooks
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notebooks" ON notebooks
    FOR DELETE 
    USING (auth.uid() = user_id);

ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;

-- Repeat for notes
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

CREATE POLICY "Users can view own notes" ON notes
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON notes
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON notes
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON notes
    FOR DELETE 
    USING (auth.uid() = user_id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Repeat for quizzes
DROP POLICY IF EXISTS "Users can view own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can insert own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can update own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can delete own quizzes" ON quizzes;

CREATE POLICY "Users can view own quizzes" ON quizzes
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quizzes" ON quizzes
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quizzes" ON quizzes
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quizzes" ON quizzes
    FOR DELETE 
    USING (auth.uid() = user_id);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('folders', 'notebooks', 'notes', 'quizzes')
ORDER BY tablename, policyname;

-- OPTIONAL: If you need to update existing data to have correct user_id
-- UPDATE folders SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE notebooks SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE notes SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE quizzes SET user_id = auth.uid() WHERE user_id IS NULL;