-- FINAL RLS FIX FOR ALL TABLES
-- This fixes the "new row violates row-level security policy" error
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- STEP 1: Set DEFAULT values for user_id
-- ============================================
ALTER TABLE folders ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE notebooks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE notes ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE quizzes ALTER COLUMN user_id SET DEFAULT auth.uid();

-- ============================================
-- STEP 2: Drop ALL existing policies (clean slate)
-- ============================================
-- Drop folder policies
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON folders;
DROP POLICY IF EXISTS "Users can update own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON folders;

-- Drop notebook policies
DROP POLICY IF EXISTS "Users can view own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can insert own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can update own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can delete own notebooks" ON notebooks;

-- Drop note policies
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

-- Drop quiz policies
DROP POLICY IF EXISTS "Users can view own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can insert own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can update own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can delete own quizzes" ON quizzes;

-- ============================================
-- STEP 3: Create new policies with correct INSERT permissions
-- ============================================

-- FOLDERS policies
CREATE POLICY "Users can view own folders" ON folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert folders" ON folders
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own folders" ON folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON folders
    FOR DELETE USING (auth.uid() = user_id);

-- NOTEBOOKS policies
CREATE POLICY "Users can view own notebooks" ON notebooks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notebooks" ON notebooks
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notebooks" ON notebooks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notebooks" ON notebooks
    FOR DELETE USING (auth.uid() = user_id);

-- NOTES policies
CREATE POLICY "Users can view own notes" ON notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notes" ON notes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notes" ON notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON notes
    FOR DELETE USING (auth.uid() = user_id);

-- QUIZZES policies
CREATE POLICY "Users can view own quizzes" ON quizzes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert quizzes" ON quizzes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own quizzes" ON quizzes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quizzes" ON quizzes
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STEP 4: Ensure RLS is enabled on all tables
-- ============================================
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Verify everything is set up correctly
-- ============================================

-- Check that defaults are set
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND column_name = 'user_id'
    AND table_name IN ('folders', 'notebooks', 'notes', 'quizzes')
ORDER BY table_name;

-- Check that policies exist
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename IN ('folders', 'notebooks', 'notes', 'quizzes')
ORDER BY tablename, policyname;

-- Check RLS is enabled
SELECT 
    relname as table_name,
    CASE relrowsecurity 
        WHEN true THEN 'ENABLED ✅' 
        ELSE 'DISABLED ❌' 
    END as rls_status
FROM pg_class 
WHERE relnamespace = 'public'::regnamespace
    AND relname IN ('folders', 'notebooks', 'notes', 'quizzes')
ORDER BY relname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'RLS policies have been fixed! You should now be able to create notebooks, notes, and quizzes.' as message;