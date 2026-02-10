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
  folder_id uuid NOT NULL,
  title text,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT fk_notes_notebook FOREIGN KEY (notebook_id) REFERENCES public.notebooks (id) ON DELETE CASCADE,
  CONSTRAINT fk_notes_folder FOREIGN KEY (folder_id) REFERENCES public.folders (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_notebook_id ON public.notes (notebook_id);
CREATE INDEX IF NOT EXISTS idx_notes_owner_id ON public.notes (owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON public.notes (folder_id);

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

-- Public invitation previews table (for anonymous access)
CREATE TABLE IF NOT EXISTS public.public_invitation_previews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token uuid UNIQUE NOT NULL,
  resource_name text NOT NULL,
  resource_type text NOT NULL,
  inviter_name text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_public_invitation_previews_token ON public.public_invitation_previews(token);

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
LEFT JOIN public.notes nt ON nt.folder_id = f.id
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
LEFT JOIN public.notes nt ON nt.folder_id = f.id
GROUP BY f.owner_id;

-- Grant permissions
GRANT SELECT ON public.folders_with_stats TO anon, authenticated;
GRANT SELECT ON public.user_stats TO anon, authenticated;

-- NOTE: RLS disabled for now - will be added in a future update
-- The app currently handles permissions at the API level
