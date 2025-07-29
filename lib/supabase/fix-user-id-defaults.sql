-- Fix user_id to automatically use auth.uid() as default
-- This way you don't need to manually set user_id when inserting

-- Set default value for user_id columns to use the current authenticated user
ALTER TABLE folders ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE notebooks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE notes ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE quizzes ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Verify the defaults are set
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND column_name = 'user_id'
    AND table_name IN ('folders', 'notebooks', 'notes', 'quizzes');

-- Now when you insert without specifying user_id, it will automatically use auth.uid()