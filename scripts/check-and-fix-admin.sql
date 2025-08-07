-- Check and fix admin status

-- 1. First, check if user_roles table exists and what's in it
SELECT 'Checking user_roles table:' as status;
SELECT * FROM user_roles WHERE role = 'admin';

-- 2. Check your current user ID
SELECT 'Your current auth user:' as status;
SELECT auth.uid() as your_user_id, 
       (SELECT email FROM auth.users WHERE id = auth.uid()) as your_email;

-- 3. Check if you're currently admin
SELECT 'Are you admin?' as status;
SELECT is_admin() as is_admin;

-- 4. Find your user by email and grant admin
SELECT 'Granting admin to nicholas.lovejoy@gmail.com:' as status;
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'nicholas.lovejoy@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';

-- 5. Also grant to your current session user
SELECT 'Granting admin to current user:' as status;
INSERT INTO user_roles (user_id, role)
VALUES (auth.uid(), 'admin')
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';

-- 6. Verify admin status
SELECT 'Final check - all admins:' as status;
SELECT ur.*, u.email 
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';

-- 7. Test if you're admin now
SELECT 'Testing admin status:' as status;
SELECT is_admin() as is_admin_now;