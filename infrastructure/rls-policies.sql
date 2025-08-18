-- Row Level Security Policies for Notemaxxing
-- These policies control who can access what data

-- FOLDERS POLICIES
-- Users can see folders they own
CREATE POLICY "Users can view own folders" ON public.folders
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can see folders shared with them
CREATE POLICY "Users can view shared folders" ON public.folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE resource_type = 'folder'
      AND resource_id = folders.id
      AND user_id = auth.uid()
    )
  );

-- Users can create their own folders
CREATE POLICY "Users can create own folders" ON public.folders
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own folders
CREATE POLICY "Users can update own folders" ON public.folders
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own folders
CREATE POLICY "Users can delete own folders" ON public.folders
  FOR DELETE USING (auth.uid() = owner_id);

-- NOTEBOOKS POLICIES
-- Users can see notebooks they own
CREATE POLICY "Users can view own notebooks" ON public.notebooks
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can see notebooks in folders shared with them
CREATE POLICY "Users can view shared notebooks" ON public.notebooks
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
CREATE POLICY "Users can create notebooks" ON public.notebooks
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own notebooks
CREATE POLICY "Users can update own notebooks" ON public.notebooks
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own notebooks
CREATE POLICY "Users can delete own notebooks" ON public.notebooks
  FOR DELETE USING (auth.uid() = owner_id);

-- NOTES POLICIES
-- Users can see notes they own
CREATE POLICY "Users can view own notes" ON public.notes
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can see notes in notebooks shared with them
CREATE POLICY "Users can view shared notes" ON public.notes
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
CREATE POLICY "Users can create notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes" ON public.notes
  FOR DELETE USING (auth.uid() = owner_id);

-- PERMISSIONS POLICIES
-- Users can see permissions for resources they own
CREATE POLICY "Users can view permissions for owned resources" ON public.permissions
  FOR SELECT USING (granted_by = auth.uid());

-- Users can see permissions granted to them
CREATE POLICY "Users can view permissions granted to them" ON public.permissions
  FOR SELECT USING (user_id = auth.uid());

-- Users can grant permissions for resources they own
CREATE POLICY "Users can create permissions" ON public.permissions
  FOR INSERT WITH CHECK (granted_by = auth.uid());

-- Users can revoke permissions they granted
CREATE POLICY "Users can delete permissions" ON public.permissions
  FOR DELETE USING (granted_by = auth.uid());

-- INVITATIONS POLICIES
-- Users can see invitations they created
CREATE POLICY "Users can view own invitations" ON public.invitations
  FOR SELECT USING (invited_by = auth.uid());

-- Anyone can view invitations by token (for accepting)
CREATE POLICY "Anyone can view invitation by token" ON public.invitations
  FOR SELECT USING (true);

-- Users can create invitations for resources they own
CREATE POLICY "Users can create invitations" ON public.invitations
  FOR INSERT WITH CHECK (invited_by = auth.uid());

-- Users can update invitations they created or are accepting
CREATE POLICY "Users can update invitations" ON public.invitations
  FOR UPDATE USING (
    invited_by = auth.uid() 
    OR accepted_by = auth.uid()
  );

-- QUIZZES POLICIES (same pattern as notebooks)
-- Users can see quizzes they own
CREATE POLICY "Users can view own quizzes" ON public.quizzes
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can create quizzes
CREATE POLICY "Users can create quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own quizzes
CREATE POLICY "Users can update own quizzes" ON public.quizzes
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own quizzes
CREATE POLICY "Users can delete own quizzes" ON public.quizzes
  FOR DELETE USING (auth.uid() = owner_id);

-- QUESTIONS POLICIES
-- Users can see questions for quizzes they own
CREATE POLICY "Users can view questions" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.owner_id = auth.uid()
    )
  );

-- Users can create questions for their quizzes
CREATE POLICY "Users can create questions" ON public.questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = quiz_id
      AND quizzes.owner_id = auth.uid()
    )
  );

-- Users can update questions for their quizzes
CREATE POLICY "Users can update questions" ON public.questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.owner_id = auth.uid()
    )
  );

-- Users can delete questions for their quizzes
CREATE POLICY "Users can delete questions" ON public.questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.owner_id = auth.uid()
    )
  );