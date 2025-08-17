-- Complete schema for Notemaxxing
-- This creates all tables, RLS policies, and functions from scratch

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE permission_level AS ENUM ('none', 'read', 'write', 'admin');
CREATE TYPE resource_type AS ENUM ('folder', 'notebook', 'note');

-- TABLES

-- Folders table
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- User who owns this folder
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notebooks table with proper ownership model
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Inherited from folder owner
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who created this notebook
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Inherited from notebook owner
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who created this note
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- User who has the permission
  resource_id UUID NOT NULL,
  resource_type resource_type NOT NULL,
  permission_level permission_level NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who granted the permission
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id, resource_type)
);

-- Invitations table (private)
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  resource_id UUID NOT NULL,
  resource_type resource_type NOT NULL,
  permission_level permission_level NOT NULL,
  invitee_email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public invitation previews (no auth required)
CREATE TABLE public_invitation_previews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token UUID UNIQUE NOT NULL,
  resource_name TEXT NOT NULL,
  resource_type resource_type NOT NULL,
  inviter_name TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- User who owns this quiz
  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_notebooks_folder_id ON notebooks(folder_id);
CREATE INDEX idx_notes_notebook_id ON notes(notebook_id);
CREATE INDEX idx_permissions_user_id ON permissions(user_id);
CREATE INDEX idx_permissions_resource ON permissions(resource_id, resource_type);

-- ROW LEVEL SECURITY

-- Enable RLS on all tables
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_invitation_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Folders policies
CREATE POLICY "Users can view own and shared folders" ON folders
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM permissions p
      WHERE p.resource_id = folders.id
      AND p.resource_type = 'folder'
      AND p.user_id = auth.uid()
      AND p.permission_level != 'none'
    )
  );

CREATE POLICY "Users can create own folders" ON folders
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (owner_id = auth.uid());

-- Notebooks policies (FIXED for folder ownership)
CREATE POLICY "Users can view notebooks" ON notebooks
  FOR SELECT USING (
    owner_id = auth.uid() OR -- I own it
    created_by = auth.uid() OR -- I created it
    EXISTS ( -- It's in a folder I own
      SELECT 1 FROM folders f
      WHERE f.id = notebooks.folder_id
      AND f.owner_id = auth.uid()
    ) OR
    EXISTS ( -- I have notebook permission
      SELECT 1 FROM permissions p
      WHERE p.resource_id = notebooks.id
      AND p.resource_type = 'notebook'
      AND p.user_id = auth.uid()
      AND p.permission_level != 'none'
    ) OR
    EXISTS ( -- I have folder permission
      SELECT 1 FROM permissions p
      WHERE p.resource_id = notebooks.folder_id
      AND p.resource_type = 'folder'
      AND p.user_id = auth.uid()
      AND p.permission_level != 'none'
    )
  );

CREATE POLICY "Users can create notebooks in accessible folders" ON notebooks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM folders f
      WHERE f.id = folder_id
      AND (
        f.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM permissions p
          WHERE p.resource_id = f.id
          AND p.resource_type = 'folder'
          AND p.user_id = auth.uid()
          AND p.permission_level = 'write'
        )
      )
    )
  );

CREATE POLICY "Users can update notebooks" ON notebooks
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM permissions p
      WHERE p.resource_id = notebooks.folder_id
      AND p.resource_type = 'folder'
      AND p.user_id = auth.uid()
      AND p.permission_level = 'write'
    )
  );

CREATE POLICY "Users can delete own notebooks" ON notebooks
  FOR DELETE USING (owner_id = auth.uid());

-- Notes policies
CREATE POLICY "Users can view notes" ON notes
  FOR SELECT USING (
    owner_id = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM notebooks n
      JOIN folders f ON f.id = n.folder_id
      WHERE n.id = notes.notebook_id
      AND f.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM permissions p
      JOIN notebooks n ON n.id = notes.notebook_id
      WHERE p.resource_id = n.folder_id
      AND p.resource_type = 'folder'
      AND p.user_id = auth.uid()
      AND p.permission_level != 'none'
    )
  );

CREATE POLICY "Users can create notes" ON notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM notebooks n
      JOIN folders f ON f.id = n.folder_id
      WHERE n.id = notebook_id
      AND (
        f.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM permissions p
          WHERE p.resource_id = f.id
          AND p.resource_type = 'folder'
          AND p.user_id = auth.uid()
          AND p.permission_level = 'write'
        )
      )
    )
  );

CREATE POLICY "Users can update notes" ON notes
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM notebooks n
      JOIN permissions p ON p.resource_id = n.folder_id
      WHERE n.id = notes.notebook_id
      AND p.resource_type = 'folder'
      AND p.user_id = auth.uid()
      AND p.permission_level = 'write'
    )
  );

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (owner_id = auth.uid());

-- Permissions policies (simple, no circular deps)
CREATE POLICY "Users can view permissions" ON permissions
  FOR SELECT USING (
    user_id = auth.uid() OR 
    granted_by = auth.uid()
  );

CREATE POLICY "Users can delete permissions they granted" ON permissions
  FOR DELETE USING (granted_by = auth.uid());

-- Invitations policies
CREATE POLICY "Users can view own invitations" ON invitations
  FOR SELECT USING (
    invited_by = auth.uid() OR
    accepted_by = auth.uid()
  );

CREATE POLICY "Users can delete own invitations" ON invitations
  FOR DELETE USING (invited_by = auth.uid());

-- Public invitation previews (anyone can view)
CREATE POLICY "Anyone can view invitation previews" ON public_invitation_previews
  FOR SELECT USING (true);

-- Quizzes policies
CREATE POLICY "Users can view own quizzes" ON quizzes
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create own quizzes" ON quizzes
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own quizzes" ON quizzes
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own quizzes" ON quizzes
  FOR DELETE USING (owner_id = auth.uid());

-- Questions policies
CREATE POLICY "Users can manage questions in own quizzes" ON questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = questions.quiz_id
      AND q.owner_id = auth.uid()
    )
  );

-- VIEWS

-- Folders with stats view
CREATE OR REPLACE VIEW folders_with_stats AS
SELECT 
  f.id,
  f.owner_id,
  f.name,
  f.color,
  f.created_at,
  f.updated_at,
  COUNT(DISTINCT n.id) FILTER (WHERE n.archived = false) as notebook_count,
  COUNT(DISTINCT n.id) FILTER (WHERE n.archived = true) as archived_count,
  COUNT(DISTINCT nt.id) as note_count
FROM folders f
LEFT JOIN notebooks n ON n.folder_id = f.id
LEFT JOIN notes nt ON nt.notebook_id = n.id
GROUP BY f.id, f.owner_id, f.name, f.color, f.created_at, f.updated_at;

-- User stats view
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  f.owner_id as user_id,
  COUNT(DISTINCT f.id) as total_folders,
  COUNT(DISTINCT n.id) as total_notebooks,
  COUNT(DISTINCT nt.id) as total_notes
FROM folders f
LEFT JOIN notebooks n ON n.folder_id = f.id
LEFT JOIN notes nt ON nt.notebook_id = n.id
GROUP BY f.owner_id;

-- FUNCTIONS

-- Create invitation function
CREATE OR REPLACE FUNCTION create_invitation(
  p_resource_id UUID,
  p_resource_type resource_type,
  p_permission_level permission_level,
  p_invitee_email TEXT,
  p_expires_in_days INTEGER DEFAULT 7
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token UUID;
  v_resource_name TEXT;
  v_inviter_name TEXT;
  v_invitation_id UUID;
BEGIN
  -- Generate token
  v_token := uuid_generate_v4();
  
  -- Get resource name
  IF p_resource_type = 'folder' THEN
    SELECT name INTO v_resource_name FROM folders WHERE id = p_resource_id;
  ELSIF p_resource_type = 'notebook' THEN
    SELECT name INTO v_resource_name FROM notebooks WHERE id = p_resource_id;
  END IF;
  
  -- Get inviter name
  SELECT email INTO v_inviter_name FROM auth.users WHERE id = auth.uid();
  
  -- Create private invitation
  INSERT INTO invitations (
    token, resource_id, resource_type, permission_level,
    invitee_email, invited_by, expires_at
  ) VALUES (
    v_token, p_resource_id, p_resource_type, p_permission_level,
    p_invitee_email, auth.uid(), NOW() + (p_expires_in_days || ' days')::INTERVAL
  ) RETURNING id INTO v_invitation_id;
  
  -- Create public preview
  INSERT INTO public_invitation_previews (
    token, resource_name, resource_type, inviter_name, expires_at
  ) VALUES (
    v_token, v_resource_name, p_resource_type, v_inviter_name,
    NOW() + (p_expires_in_days || ' days')::INTERVAL
  );
  
  RETURN v_token;
END;
$$;

-- Accept invitation function
CREATE OR REPLACE FUNCTION accept_invitation(p_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
  AND expires_at > NOW()
  AND accepted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Grant permission
  INSERT INTO permissions (
    user_id, resource_id, resource_type, permission_level, granted_by
  ) VALUES (
    auth.uid(), v_invitation.resource_id, v_invitation.resource_type,
    v_invitation.permission_level, v_invitation.invited_by
  ) ON CONFLICT (user_id, resource_id, resource_type) 
  DO UPDATE SET permission_level = EXCLUDED.permission_level;
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = NOW(), accepted_by = auth.uid()
  WHERE id = v_invitation.id;
  
  RETURN TRUE;
END;
$$;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON notebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Set ownership of notebooks to folder owner when created
CREATE OR REPLACE FUNCTION set_notebook_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Set owner_id to folder owner
  SELECT owner_id INTO NEW.owner_id FROM folders WHERE id = NEW.folder_id;
  -- Set created_by to actual creator
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_notebook_owner_on_insert BEFORE INSERT ON notebooks
  FOR EACH ROW EXECUTE FUNCTION set_notebook_owner();

-- Set ownership of notes to notebook owner when created  
CREATE OR REPLACE FUNCTION set_note_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Set owner_id to notebook owner
  SELECT owner_id INTO NEW.owner_id FROM notebooks WHERE id = NEW.notebook_id;
  -- Set created_by to actual creator
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_note_owner_on_insert BEFORE INSERT ON notes
  FOR EACH ROW EXECUTE FUNCTION set_note_owner();