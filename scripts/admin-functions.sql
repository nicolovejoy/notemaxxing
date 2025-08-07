-- Admin functions for user management
-- Run this in Supabase SQL Editor to enable admin features

-- Function to get all users (admin only)
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  folder_count bigint,
  notebook_count bigint,
  note_count bigint,
  quiz_count bigint
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(f.count, 0) as folder_count,
    COALESCE(n.count, 0) as notebook_count,
    COALESCE(nt.count, 0) as note_count,
    COALESCE(q.count, 0) as quiz_count
  FROM auth.users u
  LEFT JOIN (SELECT user_id, COUNT(*) as count FROM folders GROUP BY user_id) f ON f.user_id = u.id
  LEFT JOIN (SELECT user_id, COUNT(*) as count FROM notebooks GROUP BY user_id) n ON n.user_id = u.id
  LEFT JOIN (SELECT user_id, COUNT(*) as count FROM notes GROUP BY user_id) nt ON nt.user_id = u.id
  LEFT JOIN (SELECT user_id, COUNT(*) as count FROM quizzes GROUP BY user_id) q ON q.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to delete all user data (admin only)
CREATE OR REPLACE FUNCTION reset_user_data_admin(target_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Delete in order to respect foreign keys
  DELETE FROM notes WHERE user_id = target_user_id;
  DELETE FROM quizzes WHERE user_id = target_user_id;
  DELETE FROM notebooks WHERE user_id = target_user_id;
  DELETE FROM folders WHERE user_id = target_user_id;
  
  -- Also delete permissions and invitations
  DELETE FROM permissions WHERE user_id = target_user_id;
  DELETE FROM share_invitations WHERE created_by = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to delete a user completely (admin only)
CREATE OR REPLACE FUNCTION delete_user_admin(target_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- First delete all user data
  PERFORM reset_user_data_admin(target_user_id);
  
  -- Delete from user_roles
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  -- Delete from profiles
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Note: We cannot delete from auth.users directly
  -- That requires Supabase Admin API or dashboard access
  RAISE NOTICE 'User data deleted. To fully remove the user account, use Supabase dashboard.';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_data_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_admin(uuid) TO authenticated;