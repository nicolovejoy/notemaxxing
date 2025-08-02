-- ADMIN SETUP SCRIPT
-- Run this AFTER you've signed up again with your email

-- Grant admin role to your email
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'nicholas.lovejoy@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';

-- Verify admin setup
DO $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'nicholas.lovejoy@gmail.com';
    SELECT role INTO v_role FROM user_roles WHERE user_id = v_user_id;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'ERROR: User not found! Make sure you signed up first.';
    ELSIF v_role = 'admin' THEN
        RAISE NOTICE 'SUCCESS: Admin role granted to nicholas.lovejoy@gmail.com';
        RAISE NOTICE 'User ID: %', v_user_id;
    ELSE
        RAISE NOTICE 'ERROR: Admin role not set properly';
    END IF;
END $$;