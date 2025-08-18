-- Function to get user email from auth.users
-- This requires service role key to access auth.users table
CREATE OR REPLACE FUNCTION public.get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_email TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_email IS 'Safely retrieves user email from auth.users table';