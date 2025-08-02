-- Check existing sharing setup

-- 1. Check if has_permission function exists and its definition
\df has_permission

-- 2. Show the function definition
\sf has_permission

-- 3. Check for is_admin function
\df is_admin

-- 4. List all existing functions in public schema
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 5. Check permissions table structure
\d permissions

-- 6. Check share_invitations table structure  
\d share_invitations