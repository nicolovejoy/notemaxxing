-- Fix the reset_user_data_admin function to properly bypass RLS
-- This version uses a more direct approach

DROP FUNCTION IF EXISTS reset_user_data_admin(uuid);

CREATE OR REPLACE FUNCTION reset_user_data_admin(target_user_id uuid)
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_counts json;
  notes_count integer;
  notebooks_count integer;
  folders_count integer;
  permissions_count integer;
  invitations_count integer;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Count items before deletion for debugging
  SELECT COUNT(*) INTO notes_count FROM notes WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO notebooks_count FROM notebooks WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO folders_count FROM folders WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO permissions_count FROM permissions WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO invitations_count FROM share_invitations WHERE created_by = target_user_id;
  
  -- Log what we're about to delete
  RAISE NOTICE 'About to delete for user %: % notes, % notebooks, % folders, % permissions, % invitations', 
    target_user_id, notes_count, notebooks_count, folders_count, permissions_count, invitations_count;

  -- Delete with CASCADE behavior manually
  -- First delete items that depend on others
  DELETE FROM notes WHERE user_id = target_user_id;
  DELETE FROM notes WHERE notebook_id IN (SELECT id FROM notebooks WHERE user_id = target_user_id);
  
  -- Delete notebooks
  DELETE FROM notebooks WHERE user_id = target_user_id;
  
  -- Delete folders
  DELETE FROM folders WHERE user_id = target_user_id;
  
  -- Clean up permissions and invitations
  DELETE FROM permissions WHERE user_id = target_user_id;
  DELETE FROM share_invitations WHERE created_by = target_user_id;
  
  -- Also delete any orphaned permissions for this user's resources
  DELETE FROM permissions WHERE resource_id IN (
    SELECT id FROM folders WHERE user_id = target_user_id
    UNION
    SELECT id FROM notebooks WHERE user_id = target_user_id
  );
  
  -- Return what was deleted
  deleted_counts := json_build_object(
    'notes', notes_count,
    'notebooks', notebooks_count,
    'folders', folders_count,
    'permissions', permissions_count,
    'invitations', invitations_count,
    'user_id', target_user_id
  );
  
  RAISE NOTICE 'Successfully deleted all data for user %', target_user_id;
  
  RETURN deleted_counts;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reset_user_data_admin(uuid) TO authenticated;

-- Also create a debug function to check what data exists for a user
CREATE OR REPLACE FUNCTION check_user_data_admin(target_user_id uuid)
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  SELECT json_build_object(
    'user_id', target_user_id,
    'folders', (SELECT COUNT(*) FROM folders WHERE user_id = target_user_id),
    'notebooks', (SELECT COUNT(*) FROM notebooks WHERE user_id = target_user_id),
    'notes', (SELECT COUNT(*) FROM notes WHERE user_id = target_user_id),
    'permissions', (SELECT COUNT(*) FROM permissions WHERE user_id = target_user_id),
    'invitations', (SELECT COUNT(*) FROM share_invitations WHERE created_by = target_user_id),
    'folder_ids', (SELECT array_agg(id) FROM folders WHERE user_id = target_user_id),
    'notebook_ids', (SELECT array_agg(id) FROM notebooks WHERE user_id = target_user_id),
    'note_ids', (SELECT array_agg(id) FROM notes WHERE user_id = target_user_id)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION check_user_data_admin(uuid) TO authenticated;