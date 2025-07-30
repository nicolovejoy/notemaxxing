-- Admin functions for Notemaxxing
-- These functions help with admin operations in the debug console

-- Function to seed starter content for a specific user
-- This is a modified version of the auto-seed trigger that can be called manually
CREATE OR REPLACE FUNCTION create_starter_content_for_specific_user(target_user_id UUID)
RETURNS void AS $$
DECLARE
  getting_started_folder_id UUID;
  personal_folder_id UUID;
  welcome_notebook_id UUID;
  tutorial_notebook_id UUID;
  my_notes_notebook_id UUID;
BEGIN
  -- Check if user already has folders
  IF EXISTS (SELECT 1 FROM folders WHERE user_id = target_user_id) THEN
    RAISE NOTICE 'User already has folders, skipping seed data';
    RETURN;
  END IF;

  -- Create "Getting Started" folder
  INSERT INTO folders (user_id, name, color)
  VALUES (target_user_id, 'Getting Started', 'bg-blue-500')
  RETURNING id INTO getting_started_folder_id;

  -- Create "Personal" folder
  INSERT INTO folders (user_id, name, color)
  VALUES (target_user_id, 'Personal', 'bg-purple-500')
  RETURNING id INTO personal_folder_id;

  -- Create notebooks and notes (same as original seed function)
  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (target_user_id, getting_started_folder_id, 'Welcome to Notemaxxing!', 'bg-indigo-200', false)
  RETURNING id INTO welcome_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (target_user_id, getting_started_folder_id, 'Tutorial', 'bg-pink-200', false)
  RETURNING id INTO tutorial_notebook_id;

  INSERT INTO notebooks (user_id, folder_id, name, color, archived)
  VALUES (target_user_id, personal_folder_id, 'My Notes', 'bg-yellow-200', false)
  RETURNING id INTO my_notes_notebook_id;

  -- Create welcome notes
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (target_user_id, welcome_notebook_id, 'Welcome to Notemaxxing! 🎉', 
'# Welcome to Notemaxxing!

Thank you for joining! Notemaxxing is your personal space for organizing thoughts, taking notes, and improving your typing skills.

## Key Features

- **📁 Folders** - Organize your notebooks by topic or project
- **📓 Notebooks** - Group related notes together
- **📝 Notes** - Write and edit with auto-save
- **⌨️ Typemaxxing** - Practice typing and track your progress
- **🎯 Quizzing** - Create custom quizzes to test your knowledge

## Getting Started

1. **Create a Folder** - Click "Add Folder" to organize your notebooks
2. **Add a Notebook** - Inside a folder, create notebooks for different topics
3. **Write Notes** - Click on a notebook to start writing

## Tips

- Notes auto-save as you type
- Press `Cmd/Ctrl + S` to save manually
- Archive notebooks instead of deleting to keep your data safe
- Try Typemaxxing to improve your typing speed!

Happy note-taking! 🚀'),

  (target_user_id, welcome_notebook_id, 'Keyboard Shortcuts', 
'# Keyboard Shortcuts

## Navigation
- **Home** - Click the logo or press `Alt + H`
- **Folders** - Navigate through your folder structure

## Editing
- **Save** - `Cmd/Ctrl + S` (though notes auto-save!)
- **Bold** - `Cmd/Ctrl + B`
- **Italic** - `Cmd/Ctrl + I`
- **Undo** - `Cmd/Ctrl + Z`
- **Redo** - `Cmd/Ctrl + Shift + Z`

## Tips
- Double-click folder/notebook names to rename
- Drag and drop coming soon!'),

  (target_user_id, welcome_notebook_id, 'Tips & Tricks', 
'# Tips & Tricks

## Organization
- Use **folders** for broad categories (Work, Personal, Learning)
- Create **notebooks** for specific projects or topics
- Keep related notes in the same notebook for easy access

## Writing Better Notes
1. **Use clear titles** - Make notes easy to find later
2. **Add headers** - Structure long notes with sections
3. **Be concise** - Capture key points quickly
4. **Review regularly** - Keep your notes relevant

## Features to Try
- **Archive notebooks** - Hide old notebooks without deleting
- **Typemaxxing** - Practice typing with instant feedback
- **Quizzing** - Create quizzes from your notes
- **Color coding** - Use colors to visually organize

## Pro Tips
- Notes are searchable - use descriptive titles
- Export options coming soon
- Check back for new features!');

  -- Tutorial notes
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (target_user_id, tutorial_notebook_id, 'Creating Folders & Notebooks', 
'# Creating Folders & Notebooks

## Creating a Folder
1. Go to the **Folders** page
2. Click **"Add Folder"**
3. Enter a name (e.g., "Work Projects")
4. Choose a color to make it stand out
5. Click **Create**

## Creating a Notebook
1. Click on any folder to open it
2. Click **"Add Notebook"**
3. Give it a meaningful name
4. Pick a color (different from the folder for clarity)
5. Start adding notes!

## Organizing Tips
- Group similar topics in one folder
- Use descriptive names
- Archive old notebooks to declutter
- You can always rename by double-clicking!'),

  (target_user_id, tutorial_notebook_id, 'Writing Notes', 
'# Writing Notes

## Creating a Note
1. Open any notebook
2. Click **"Add Note"**
3. Start typing - your note saves automatically!

## Formatting
- Use **Markdown** for formatting
- Headers with # (one for H1, two for H2, etc.)
- **Bold** with **double asterisks**
- *Italic* with *single asterisks*
- Lists with - or 1.

## Best Practices
- Give notes descriptive titles
- Keep one topic per note
- Use headers to organize long notes
- Review and update regularly'),

  (target_user_id, tutorial_notebook_id, 'Using Quizzes', 
'# Using Quizzes

## Creating a Quiz
1. Go to **Quizzing** from the menu
2. Click **"Create Quiz"**
3. Add a subject (e.g., "JavaScript Basics")
4. Add questions and answers
5. Save your quiz

## Taking Quizzes
- Select a quiz from your list
- Answer each question
- Check your answers
- Track your progress over time

## Tips for Effective Quizzes
- Create quizzes from your notes
- Test yourself regularly
- Focus on concepts you find challenging
- Use quizzes before exams or interviews');

  -- Personal starter note
  INSERT INTO notes (user_id, notebook_id, title, content) VALUES
  (target_user_id, my_notes_notebook_id, 'My First Note', 
'# My First Note

Start writing here... 

This notebook is yours to fill with whatever you need - ideas, tasks, journal entries, or anything else!

Feel free to delete this note when you''re ready to begin.');

  -- Add sample quiz
  INSERT INTO quizzes (user_id, subject, questions) VALUES
  (target_user_id, 'Notemaxxing Tutorial', 
  '[
    {
      "id": "q1",
      "question": "What keyboard shortcut saves a note?",
      "answer": "Cmd/Ctrl + S (though notes auto-save!)"
    },
    {
      "id": "q2", 
      "question": "How do you archive a notebook?",
      "answer": "Click the archive button when hovering over a notebook, or use the archive option in the notebook menu"
    },
    {
      "id": "q3",
      "question": "What are the main organizational levels in Notemaxxing?",
      "answer": "Folders → Notebooks → Notes"
    },
    {
      "id": "q4",
      "question": "How do you rename a folder or notebook?",
      "answer": "Double-click on the name or click the edit button"
    },
    {
      "id": "q5",
      "question": "What feature helps you improve your typing speed?",
      "answer": "Typemaxxing - it tracks WPM and accuracy in real-time"
    }
  ]'::jsonb);

END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users (admin check happens in app)
GRANT EXECUTE ON FUNCTION create_starter_content_for_specific_user TO authenticated;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID)
RETURNS TABLE (
  folders_count BIGINT,
  notebooks_count BIGINT,
  notes_count BIGINT,
  quizzes_count BIGINT,
  total_size_estimate TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM folders WHERE user_id = target_user_id),
    (SELECT COUNT(*) FROM notebooks WHERE user_id = target_user_id),
    (SELECT COUNT(*) FROM notes WHERE user_id = target_user_id),
    (SELECT COUNT(*) FROM quizzes WHERE user_id = target_user_id),
    pg_size_pretty(
      (SELECT SUM(pg_column_size(content)) FROM notes WHERE user_id = target_user_id)::BIGINT
    ) as total_size_estimate;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_stats TO authenticated;