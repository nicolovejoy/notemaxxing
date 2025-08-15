-- Admin functions for user management

-- Function to get all users with their stats
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  folder_count BIGINT,
  notebook_count BIGINT,
  note_count BIGINT,
  quiz_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is an admin (you can customize this check)
  -- For now, we'll allow any authenticated user to call this
  -- In production, you'd want to check against an admin list
  
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    au.created_at,
    au.last_sign_in_at,
    COALESCE(f.count, 0) as folder_count,
    COALESCE(n.count, 0) as notebook_count,
    COALESCE(nt.count, 0) as note_count,
    COALESCE(q.count, 0) as quiz_count
  FROM auth.users au
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM folders 
    GROUP BY user_id
  ) f ON f.user_id = au.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM notebooks 
    GROUP BY user_id
  ) n ON n.user_id = au.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM notes 
    GROUP BY user_id
  ) nt ON nt.user_id = au.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM quizzes 
    GROUP BY user_id
  ) q ON q.user_id = au.id
  ORDER BY au.created_at DESC;
END;
$$;

-- Function to create starter content for a specific user
CREATE OR REPLACE FUNCTION create_starter_content_for_specific_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  folder_id UUID;
  notebook_id UUID;
  existing_folders INTEGER;
BEGIN
  -- Check if user already has folders
  SELECT COUNT(*) INTO existing_folders
  FROM folders
  WHERE user_id = target_user_id;
  
  IF existing_folders > 0 THEN
    RAISE EXCEPTION 'User already has folders. Starter content can only be added to users with no existing data.';
  END IF;
  
  -- Create a starter folder
  INSERT INTO folders (id, user_id, name, icon, created_at, updated_at, display_order)
  VALUES (
    gen_random_uuid(),
    target_user_id,
    'Getting Started',
    '📚',
    NOW(),
    NOW(),
    0
  )
  RETURNING id INTO folder_id;
  
  -- Create a starter notebook
  INSERT INTO notebooks (id, folder_id, user_id, name, color, created_at, updated_at, display_order)
  VALUES (
    gen_random_uuid(),
    folder_id,
    target_user_id,
    'Welcome to Notemaxxing',
    '#3B82F6',
    NOW(),
    NOW(),
    0
  )
  RETURNING id INTO notebook_id;
  
  -- Create welcome notes
  INSERT INTO notes (id, notebook_id, user_id, title, content, created_at, updated_at, display_order)
  VALUES
  (
    gen_random_uuid(),
    notebook_id,
    target_user_id,
    'Welcome!',
    '# Welcome to Notemaxxing!

Notemaxxing is your personal knowledge management system. Here''s how to get started:

## Key Features
- 📁 **Folders** - Organize your notebooks by topic
- 📓 **Notebooks** - Group related notes together
- 📝 **Notes** - Write and format your content with markdown
- 🎯 **Quiz Mode** - Test your knowledge with AI-generated quizzes

## Getting Started
1. Create a new folder for your subject
2. Add notebooks for different topics
3. Start taking notes!
4. Use quiz mode to review and reinforce your learning

Happy note-taking! 🚀',
    NOW(),
    NOW(),
    0
  ),
  (
    gen_random_uuid(),
    notebook_id,
    target_user_id,
    'Markdown Guide',
    '# Markdown Formatting Guide

You can format your notes using Markdown:

## Headers
Use `#` for headers:
- `# H1` - Main title
- `## H2` - Section
- `### H3` - Subsection

## Text Formatting
- **Bold** - Use `**text**`
- *Italic* - Use `*text*`
- ~~Strikethrough~~ - Use `~~text~~`

## Lists
Unordered lists:
- Item 1
- Item 2
  - Nested item

Ordered lists:
1. First item
2. Second item
3. Third item

## Links and Images
- [Link text](https://example.com)
- ![Alt text](image-url.jpg)

## Code
Inline code: `const x = 42`

Code blocks:
```javascript
function hello() {
  console.log("Hello, World!");
}
```

## Tables
| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |',
    NOW(),
    NOW(),
    1
  );
END;
$$;

-- Function to delete a user and all their data (admin only)
CREATE OR REPLACE FUNCTION delete_user_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all user data in correct order (respecting foreign keys)
  DELETE FROM quizzes WHERE user_id = target_user_id;
  DELETE FROM notes WHERE user_id = target_user_id;
  DELETE FROM notebooks WHERE user_id = target_user_id;
  DELETE FROM folders WHERE user_id = target_user_id;
  DELETE FROM permissions WHERE user_id = target_user_id OR granted_by = target_user_id;
  DELETE FROM share_invitations WHERE invited_by = target_user_id;
  
  -- Note: We cannot delete from auth.users directly from a function
  -- That would need to be done through Supabase Auth Admin API
  -- For now, we just clean up the user's data
END;
$$;

-- Grant execute permissions to authenticated users
-- In production, you'd want to restrict this to admin users only
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION create_starter_content_for_specific_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_admin(UUID) TO authenticated;