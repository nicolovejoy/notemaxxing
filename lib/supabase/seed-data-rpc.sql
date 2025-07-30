-- Create a safe RPC function to seed data that won't break signups
CREATE OR REPLACE FUNCTION seed_new_user_data(target_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_to_seed UUID;
  getting_started_folder_id UUID;
  personal_folder_id UUID;
  welcome_notebook_id UUID;
  tutorial_notebook_id UUID;
  my_notes_notebook_id UUID;
  result JSON;
BEGIN
  -- Use provided user_id or current user
  user_id_to_seed := COALESCE(target_user_id, auth.uid());
  
  -- Check if user already has folders
  IF EXISTS (SELECT 1 FROM folders WHERE user_id = user_id_to_seed) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User already has folders'
    );
  END IF;

  BEGIN
    -- Create folders
    INSERT INTO folders (user_id, name, color)
    VALUES (user_id_to_seed, 'Getting Started', 'bg-blue-500')
    RETURNING id INTO getting_started_folder_id;

    INSERT INTO folders (user_id, name, color)
    VALUES (user_id_to_seed, 'Personal', 'bg-purple-500')
    RETURNING id INTO personal_folder_id;

    -- Create notebooks
    INSERT INTO notebooks (user_id, folder_id, name, color, archived)
    VALUES (user_id_to_seed, getting_started_folder_id, 'Welcome to Notemaxxing!', 'bg-indigo-200', false)
    RETURNING id INTO welcome_notebook_id;

    INSERT INTO notebooks (user_id, folder_id, name, color, archived)
    VALUES (user_id_to_seed, getting_started_folder_id, 'Tutorial', 'bg-pink-200', false)
    RETURNING id INTO tutorial_notebook_id;

    INSERT INTO notebooks (user_id, folder_id, name, color, archived)
    VALUES (user_id_to_seed, personal_folder_id, 'My Notes', 'bg-yellow-200', false)
    RETURNING id INTO my_notes_notebook_id;

    -- Create notes (simplified for brevity)
    INSERT INTO notes (user_id, notebook_id, title, content) VALUES
    (user_id_to_seed, welcome_notebook_id, 'Welcome to Notemaxxing! 🎉', 
'# Welcome to Notemaxxing!

Thank you for joining! Start exploring the features and organize your thoughts.'),
    (user_id_to_seed, tutorial_notebook_id, 'Getting Started', 
'# Getting Started

1. Create folders to organize your notebooks
2. Add notebooks to group related notes
3. Write notes with auto-save
4. Try Typemaxxing to improve your typing speed!'),
    (user_id_to_seed, my_notes_notebook_id, 'My First Note', 
'# My First Note

Start writing here...');

    RETURN json_build_object(
      'success', true,
      'message', 'Seed data created successfully',
      'folders_created', 2,
      'notebooks_created', 3,
      'notes_created', 3
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to create seed data',
      'error', SQLERRM
    );
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION seed_new_user_data(UUID) TO authenticated;