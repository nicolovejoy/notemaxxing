-- Complete database setup for Notemaxxing
-- Run this against a fresh Supabase database

-- Create tables (if they don't exist)

CREATE TABLE IF NOT EXISTS public.folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_folders_owner_id ON public.folders (owner_id);

CREATE TABLE IF NOT EXISTS public.notebooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  created_by uuid NOT NULL,
  folder_id uuid,
  name text NOT NULL,
  color text NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT fk_notebooks_folder FOREIGN KEY (folder_id) REFERENCES public.folders (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notebooks_owner_id ON public.notebooks (owner_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_folder_id ON public.notebooks (folder_id);

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  created_by uuid NOT NULL,
  notebook_id uuid NOT NULL,
  title text,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT fk_notes_notebook FOREIGN KEY (notebook_id) REFERENCES public.notebooks (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_notebook_id ON public.notes (notebook_id);
CREATE INDEX IF NOT EXISTS idx_notes_owner_id ON public.notes (owner_id);

CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  notebook_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT fk_quizzes_notebook FOREIGN KEY (notebook_id) REFERENCES public.notebooks (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quizzes_owner_id ON public.quizzes (owner_id);

CREATE TABLE IF NOT EXISTS public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  type text NOT NULL,
  options jsonb,
  order_index integer NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_questions_quiz FOREIGN KEY (quiz_id) REFERENCES public.quizzes (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions (quiz_id);

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  user_id uuid NOT NULL,
  permission_level text NOT NULL,
  granted_by uuid,
  granted_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_user_resource ON public.permissions (user_id, resource_type, resource_id);

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  invitee_email text NOT NULL,
  permission_level text NOT NULL,
  invited_by uuid NOT NULL,
  token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid,
  transfer_ownership_on_accept boolean DEFAULT false,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations (token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations (invitee_email);

-- Create views
DROP VIEW IF EXISTS public.folders_with_stats CASCADE;
CREATE VIEW public.folders_with_stats AS
SELECT 
  f.id,
  f.owner_id,
  f.name,
  f.color,
  f.created_at,
  f.updated_at,
  COUNT(DISTINCT n.id) FILTER (WHERE n.archived = false) as notebook_count,
  COUNT(DISTINCT n.id) FILTER (WHERE n.archived = true) as archived_count,
  COUNT(DISTINCT nt.id) as note_count,
  MAX(GREATEST(f.updated_at, n.updated_at, nt.updated_at)) as last_activity
FROM public.folders f
LEFT JOIN public.notebooks n ON n.folder_id = f.id
LEFT JOIN public.notes nt ON nt.notebook_id = n.id
GROUP BY f.id, f.owner_id, f.name, f.color, f.created_at, f.updated_at;

DROP VIEW IF EXISTS public.user_stats CASCADE;
CREATE VIEW public.user_stats AS
SELECT 
  f.owner_id as user_id,
  COUNT(DISTINCT f.id) as total_folders,
  COUNT(DISTINCT n.id) as total_notebooks,
  COUNT(DISTINCT nt.id) as total_notes,
  COUNT(DISTINCT n.id) FILTER (WHERE n.archived = true) as total_archived
FROM public.folders f
LEFT JOIN public.notebooks n ON n.folder_id = f.id
LEFT JOIN public.notes nt ON nt.notebook_id = n.id
GROUP BY f.owner_id;

-- Grant permissions
GRANT SELECT ON public.folders_with_stats TO anon, authenticated;
GRANT SELECT ON public.user_stats TO anon, authenticated;

-- Enable RLS on all tables
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR FOLDERS
-- Users can see folders they own
CREATE POLICY IF NOT EXISTS "Users can view own folders" ON public.folders
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can see folders shared with them
CREATE POLICY IF NOT EXISTS "Users can view shared folders" ON public.folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE resource_type = 'folder'
      AND resource_id = folders.id
      AND user_id = auth.uid()
    )
  );

-- Users can create their own folders
CREATE POLICY IF NOT EXISTS "Users can create own folders" ON public.folders
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own folders
CREATE POLICY IF NOT EXISTS "Users can update own folders" ON public.folders
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own folders
CREATE POLICY IF NOT EXISTS "Users can delete own folders" ON public.folders
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS POLICIES FOR NOTEBOOKS
-- Users can see notebooks they own
CREATE POLICY IF NOT EXISTS "Users can view own notebooks" ON public.notebooks
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can see notebooks in folders shared with them
CREATE POLICY IF NOT EXISTS "Users can view shared notebooks" ON public.notebooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE (
        (resource_type = 'notebook' AND resource_id = notebooks.id)
        OR (resource_type = 'folder' AND resource_id = notebooks.folder_id)
      )
      AND user_id = auth.uid()
    )
  );

-- Users can create notebooks in their own folders
CREATE POLICY IF NOT EXISTS "Users can create notebooks" ON public.notebooks
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own notebooks
CREATE POLICY IF NOT EXISTS "Users can update own notebooks" ON public.notebooks
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own notebooks
CREATE POLICY IF NOT EXISTS "Users can delete own notebooks" ON public.notebooks
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS POLICIES FOR NOTES
-- Users can see notes they own
CREATE POLICY IF NOT EXISTS "Users can view own notes" ON public.notes
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can see notes in notebooks shared with them
CREATE POLICY IF NOT EXISTS "Users can view shared notes" ON public.notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notebooks n
      LEFT JOIN public.permissions p ON (
        (p.resource_type = 'notebook' AND p.resource_id = n.id)
        OR (p.resource_type = 'folder' AND p.resource_id = n.folder_id)
      )
      WHERE n.id = notes.notebook_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can create notes in their notebooks
CREATE POLICY IF NOT EXISTS "Users can create notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own notes
CREATE POLICY IF NOT EXISTS "Users can update own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own notes
CREATE POLICY IF NOT EXISTS "Users can delete own notes" ON public.notes
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS POLICIES FOR PERMISSIONS
-- Users can see permissions for resources they own
CREATE POLICY IF NOT EXISTS "Users can view permissions for owned resources" ON public.permissions
  FOR SELECT USING (granted_by = auth.uid());

-- Users can see permissions granted to them
CREATE POLICY IF NOT EXISTS "Users can view permissions granted to them" ON public.permissions
  FOR SELECT USING (user_id = auth.uid());

-- Users can grant permissions for resources they own
CREATE POLICY IF NOT EXISTS "Users can create permissions" ON public.permissions
  FOR INSERT WITH CHECK (granted_by = auth.uid());

-- Users can revoke permissions they granted
CREATE POLICY IF NOT EXISTS "Users can delete permissions" ON public.permissions
  FOR DELETE USING (granted_by = auth.uid());

-- RLS POLICIES FOR INVITATIONS
-- Users can see invitations they created
CREATE POLICY IF NOT EXISTS "Users can view own invitations" ON public.invitations
  FOR SELECT USING (invited_by = auth.uid());

-- Anyone can view invitations by token (for accepting)
CREATE POLICY IF NOT EXISTS "Anyone can view invitation by token" ON public.invitations
  FOR SELECT USING (true);

-- Users can create invitations for resources they own
CREATE POLICY IF NOT EXISTS "Users can create invitations" ON public.invitations
  FOR INSERT WITH CHECK (invited_by = auth.uid());

-- Users can update invitations they created or are accepting
CREATE POLICY IF NOT EXISTS "Users can update invitations" ON public.invitations
  FOR UPDATE USING (
    invited_by = auth.uid() 
    OR accepted_by = auth.uid()
  );

-- RLS POLICIES FOR QUIZZES
-- Users can see quizzes they own
CREATE POLICY IF NOT EXISTS "Users can view own quizzes" ON public.quizzes
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can create quizzes
CREATE POLICY IF NOT EXISTS "Users can create quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own quizzes
CREATE POLICY IF NOT EXISTS "Users can update own quizzes" ON public.quizzes
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own quizzes
CREATE POLICY IF NOT EXISTS "Users can delete own quizzes" ON public.quizzes
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS POLICIES FOR QUESTIONS
-- Users can see questions for quizzes they own
CREATE POLICY IF NOT EXISTS "Users can view questions" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.owner_id = auth.uid()
    )
  );

-- Users can create questions for their quizzes
CREATE POLICY IF NOT EXISTS "Users can create questions" ON public.questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = quiz_id
      AND quizzes.owner_id = auth.uid()
    )
  );

-- Users can update questions for their quizzes
CREATE POLICY IF NOT EXISTS "Users can update questions" ON public.questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.owner_id = auth.uid()
    )
  );

-- Users can delete questions for their quizzes
CREATE POLICY IF NOT EXISTS "Users can delete questions" ON public.questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.owner_id = auth.uid()
    )
  );