-- Row Level Security Policies for Notemaxxing
-- This file contains RLS policies that secure the database while maintaining functionality
-- IMPORTANT: The public_invitation_previews table remains without RLS for anonymous access

-- Enable RLS on all tables except public_invitation_previews
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Keep public_invitation_previews WITHOUT RLS (needed for anonymous invitation preview)
-- This table only contains non-sensitive preview data

-- =============================================================================
-- FOLDERS POLICIES
-- =============================================================================

-- Owners can do everything with their folders
CREATE POLICY "folder_owner_all" ON public.folders
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Users with permissions can read folders they have access to
CREATE POLICY "folder_shared_read" ON public.folders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE permissions.user_id = auth.uid()
        AND permissions.resource_id = folders.id
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level IN ('read', 'write')
    )
  );

-- Users with write permission can update shared folders
CREATE POLICY "folder_shared_write" ON public.folders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE permissions.user_id = auth.uid()
        AND permissions.resource_id = folders.id
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level = 'write'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE permissions.user_id = auth.uid()
        AND permissions.resource_id = folders.id
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level = 'write'
    )
  );

-- =============================================================================
-- NOTEBOOKS POLICIES
-- =============================================================================

-- Owners can do everything with their notebooks
CREATE POLICY "notebook_owner_all" ON public.notebooks
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Users can read notebooks in folders they have access to
CREATE POLICY "notebook_shared_read" ON public.notebooks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE permissions.user_id = auth.uid()
        AND permissions.resource_id = notebooks.folder_id
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level IN ('read', 'write')
    )
  );

-- Users with write permission on folder can create/update/delete notebooks
CREATE POLICY "notebook_shared_write" ON public.notebooks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE permissions.user_id = auth.uid()
        AND permissions.resource_id = notebooks.folder_id
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level = 'write'
    )
  );

CREATE POLICY "notebook_shared_update" ON public.notebooks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE permissions.user_id = auth.uid()
        AND permissions.resource_id = notebooks.folder_id
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level = 'write'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE permissions.user_id = auth.uid()
        AND permissions.resource_id = notebooks.folder_id
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level = 'write'
    )
  );

CREATE POLICY "notebook_shared_delete" ON public.notebooks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE permissions.user_id = auth.uid()
        AND permissions.resource_id = notebooks.folder_id
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level = 'write'
    )
  );

-- =============================================================================
-- NOTES POLICIES
-- =============================================================================

-- Owners can do everything with their notes
CREATE POLICY "note_owner_all" ON public.notes
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Users can read notes in notebooks they have folder access to
CREATE POLICY "note_shared_read" ON public.notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.notebooks
      JOIN public.permissions ON permissions.resource_id = notebooks.folder_id
      WHERE notebooks.id = notes.notebook_id
        AND permissions.user_id = auth.uid()
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level IN ('read', 'write')
    )
  );

-- Users with write permission can create/update/delete notes
CREATE POLICY "note_shared_write" ON public.notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.notebooks
      JOIN public.permissions ON permissions.resource_id = notebooks.folder_id
      WHERE notebooks.id = notes.notebook_id
        AND permissions.user_id = auth.uid()
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level = 'write'
    )
  );

CREATE POLICY "note_shared_update" ON public.notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.notebooks
      JOIN public.permissions ON permissions.resource_id = notebooks.folder_id
      WHERE notebooks.id = notes.notebook_id
        AND permissions.user_id = auth.uid()
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level = 'write'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.notebooks
      JOIN public.permissions ON permissions.resource_id = notebooks.folder_id
      WHERE notebooks.id = notes.notebook_id
        AND permissions.user_id = auth.uid()
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level = 'write'
    )
  );

CREATE POLICY "note_shared_delete" ON public.notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.notebooks
      JOIN public.permissions ON permissions.resource_id = notebooks.folder_id
      WHERE notebooks.id = notes.notebook_id
        AND permissions.user_id = auth.uid()
        AND permissions.resource_type = 'folder'
        AND permissions.permission_level = 'write'
    )
  );

-- =============================================================================
-- PERMISSIONS POLICIES
-- =============================================================================

-- Users can see their own permissions
CREATE POLICY "permission_own_read" ON public.permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- Resource owners can manage permissions for their resources
CREATE POLICY "permission_owner_manage" ON public.permissions
  FOR ALL
  USING (
    -- Check if user owns the folder being shared
    EXISTS (
      SELECT 1 FROM public.folders
      WHERE folders.id = permissions.resource_id
        AND folders.owner_id = auth.uid()
        AND permissions.resource_type = 'folder'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.folders
      WHERE folders.id = permissions.resource_id
        AND folders.owner_id = auth.uid()
        AND permissions.resource_type = 'folder'
    )
  );

-- =============================================================================
-- INVITATIONS POLICIES
-- =============================================================================

-- Anyone can read invitations by token (needed for preview/accept flow)
-- But only non-sensitive fields should be exposed
CREATE POLICY "invitation_by_token" ON public.invitations
  FOR SELECT
  USING (true); -- Token-based access is handled at API layer

-- Resource owners can create and manage invitations
CREATE POLICY "invitation_owner_manage" ON public.invitations
  FOR ALL
  USING (
    -- Check if user owns the resource being invited to
    EXISTS (
      SELECT 1 FROM public.folders
      WHERE folders.id = invitations.resource_id
        AND folders.owner_id = auth.uid()
        AND invitations.resource_type = 'folder'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.folders
      WHERE folders.id = invitations.resource_id
        AND folders.owner_id = auth.uid()
        AND invitations.resource_type = 'folder'
    )
  );

-- =============================================================================
-- QUIZZES POLICIES
-- =============================================================================

-- Owners can do everything with their quizzes
CREATE POLICY "quiz_owner_all" ON public.quizzes
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- =============================================================================
-- QUESTIONS POLICIES
-- =============================================================================

-- Users can manage questions for quizzes they own
CREATE POLICY "question_owner_all" ON public.questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = questions.quiz_id
        AND quizzes.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = questions.quiz_id
        AND quizzes.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- VIEWS (Already have implicit RLS through underlying tables)
-- =============================================================================
-- Views like folders_with_stats and user_stats automatically respect
-- the RLS policies of their underlying tables