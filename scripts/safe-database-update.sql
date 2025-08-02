-- SAFE DATABASE UPDATE SCRIPT
-- This only adds missing components without errors

-- ========================================
-- 1. ENABLE EXTENSIONS (safe to run multiple times)
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 2. CREATE MISSING TABLES ONLY
-- ========================================

-- Profiles table (likely missing based on REBUILD_PLAN.md)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User roles table (might be missing)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. ENABLE RLS (safe to run multiple times)
-- ========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. CREATE OR REPLACE FUNCTIONS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY INVOKER;

-- ========================================
-- 5. CREATE TRIGGERS ONLY IF MISSING
-- ========================================

-- Drop and recreate trigger for profiles (if table was just created)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Drop and recreate trigger for user_roles (if table was just created)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_roles_updated_at') THEN
    CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ========================================
-- 6. CREATE RLS POLICIES (DROP OLD ONES FIRST)
-- ========================================

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
DROP POLICY IF EXISTS "Users see own role" ON user_roles;
CREATE POLICY "Users see own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Fix folder policies to ensure they work
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own folders" ON folders;
CREATE POLICY "Users can create own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own folders" ON folders;
CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own folders" ON folders;
CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);

-- Fix notebook policies
DROP POLICY IF EXISTS "Users can view own notebooks" ON notebooks;
CREATE POLICY "Users can view own notebooks" ON notebooks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own notebooks" ON notebooks;
CREATE POLICY "Users can create own notebooks" ON notebooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notebooks" ON notebooks;
CREATE POLICY "Users can update own notebooks" ON notebooks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notebooks" ON notebooks;
CREATE POLICY "Users can delete own notebooks" ON notebooks
  FOR DELETE USING (auth.uid() = user_id);

-- Fix notes policies with proper user_id check
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create notes in own notebooks" ON notes;
CREATE POLICY "Users can create notes in own notebooks" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 7. VERIFY SETUP
-- ========================================
DO $$
DECLARE
    has_profiles BOOLEAN;
    has_user_roles BOOLEAN;
BEGIN
    -- Check if critical tables exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO has_profiles;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) INTO has_user_roles;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE UPDATE COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Profiles table exists: %', has_profiles;
    RAISE NOTICE 'User roles table exists: %', has_user_roles;
    RAISE NOTICE '';
    RAISE NOTICE 'You can now sign up and use the app!';
    RAISE NOTICE '========================================';
END $$;