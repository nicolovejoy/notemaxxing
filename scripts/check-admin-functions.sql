-- Check which admin functions exist in the database

-- List all functions that contain 'admin' or 'user' in their name
SELECT 
    routine_name as function_name,
    routine_schema as schema,
    data_type as return_type
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
  AND routine_schema = 'public'
  AND (routine_name LIKE '%admin%' OR routine_name LIKE '%user%')
ORDER BY routine_name;

-- Also check if user_roles table exists
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_roles'
) as user_roles_table_exists;

-- Check if is_admin function exists specifically
SELECT EXISTS (
    SELECT 1
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'is_admin'
) as is_admin_function_exists;

-- List all RPC functions available
SELECT 
    routine_name,
    routine_schema
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
  AND routine_schema = 'public'
ORDER BY routine_name;