-- Add reset_user_data_admin function to clear user data without deleting the account
-- This complements the existing delete_user_admin function

CREATE OR REPLACE FUNCTION reset_user_data_admin(target_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin using the existing is_admin() function
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Delete in order to respect foreign keys
  DELETE FROM notes WHERE user_id = target_user_id;
  DELETE FROM quizzes WHERE user_id = target_user_id;
  DELETE FROM notebooks WHERE user_id = target_user_id;
  DELETE FROM folders WHERE user_id = target_user_id;
  
  -- Also delete permissions and invitations created by this user
  DELETE FROM permissions WHERE user_id = target_user_id;
  DELETE FROM share_invitations WHERE created_by = target_user_id;
  
  RAISE NOTICE 'Successfully reset all data for user %', target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reset_user_data_admin(uuid) TO authenticated;