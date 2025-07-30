-- Function to get all users with their stats
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  folder_count BIGINT,
  notebook_count BIGINT,
  note_count BIGINT,
  quiz_count BIGINT
)
SECURITY DEFINER
AS $$
BEGIN
  -- TODO: Add proper admin check here
  -- For now, we'll rely on client-side check (not secure for production!)
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(f.count, 0) as folder_count,
    COALESCE(nb.count, 0) as notebook_count,
    COALESCE(n.count, 0) as note_count,
    COALESCE(q.count, 0) as quiz_count
  FROM auth.users u
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM folders 
    GROUP BY user_id
  ) f ON f.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM notebooks 
    GROUP BY user_id
  ) nb ON nb.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM notes 
    GROUP BY user_id
  ) n ON n.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM quizzes 
    GROUP BY user_id
  ) q ON q.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to delete a user (cascades to all their data)
CREATE OR REPLACE FUNCTION delete_user_admin(user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
  -- TODO: Add proper admin check here
  -- For now, we'll rely on client-side check (not secure for production!)
  
  -- Delete from auth.users (cascades to all user data)
  DELETE FROM auth.users WHERE id = user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_admin(UUID) TO authenticated;