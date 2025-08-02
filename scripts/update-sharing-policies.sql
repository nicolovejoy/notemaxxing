-- Update sharing policies to work with existing setup
-- This script assumes you already have has_permission and is_admin functions

-- ========================================
-- 1. UPDATE FOLDERS POLICIES (if needed)
-- ========================================

-- Check if folders have sharing policies, if not add them
DO $$ 
BEGIN
    -- Add policy for viewing shared folders if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'folders' 
        AND policyname = 'Users can view shared folders'
    ) THEN
        CREATE POLICY "Users can view shared folders" ON folders
        FOR SELECT USING (
            has_permission('folder', id, auth.uid(), 'read')
        );
    END IF;

    -- Add policy for editing shared folders with write permission
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'folders' 
        AND policyname = 'Users can edit shared folders with write permission'
    ) THEN
        CREATE POLICY "Users can edit shared folders with write permission" ON folders
        FOR UPDATE USING (
            has_permission('folder', id, auth.uid(), 'write')
        );
    END IF;
END $$;

-- ========================================
-- 2. UPDATE NOTEBOOKS POLICIES (if needed)
-- ========================================

DO $$ 
BEGIN
    -- Add policy for viewing shared notebooks if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notebooks' 
        AND policyname = 'Users can view shared notebooks'
    ) THEN
        CREATE POLICY "Users can view shared notebooks" ON notebooks
        FOR SELECT USING (
            has_permission('notebook', id, auth.uid(), 'read')
        );
    END IF;

    -- Add policy for notebooks in shared folders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notebooks' 
        AND policyname = 'Users can view notebooks in shared folders'
    ) THEN
        CREATE POLICY "Users can view notebooks in shared folders" ON notebooks
        FOR SELECT USING (
            has_permission('folder', folder_id, auth.uid(), 'read')
        );
    END IF;

    -- Add policy for editing shared notebooks
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notebooks' 
        AND policyname = 'Users can edit shared notebooks with write permission'
    ) THEN
        CREATE POLICY "Users can edit shared notebooks with write permission" ON notebooks
        FOR UPDATE USING (
            has_permission('notebook', id, auth.uid(), 'write')
            OR
            has_permission('folder', folder_id, auth.uid(), 'write')
        );
    END IF;
END $$;

-- ========================================
-- 3. PERMISSIONS TABLE POLICIES
-- ========================================

-- Only add if table exists and policies don't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
        -- Users can view permissions for resources they own or have access to
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'permissions' 
            AND policyname = 'Users can view relevant permissions'
        ) THEN
            CREATE POLICY "Users can view relevant permissions" ON permissions
            FOR SELECT USING (
                user_id = auth.uid() 
                OR 
                granted_by = auth.uid()
                OR
                (resource_type = 'folder' AND resource_id IN (
                    SELECT id FROM folders WHERE user_id = auth.uid()
                ))
                OR
                (resource_type = 'notebook' AND resource_id IN (
                    SELECT id FROM notebooks WHERE user_id = auth.uid()
                ))
            );
        END IF;

        -- Only resource owners can insert permissions
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'permissions' 
            AND policyname = 'Resource owners can grant permissions'
        ) THEN
            CREATE POLICY "Resource owners can grant permissions" ON permissions
            FOR INSERT WITH CHECK (
                (resource_type = 'folder' AND resource_id IN (
                    SELECT id FROM folders WHERE user_id = auth.uid()
                ))
                OR
                (resource_type = 'notebook' AND resource_id IN (
                    SELECT id FROM notebooks WHERE user_id = auth.uid()
                ))
            );
        END IF;

        -- Owners and users can revoke permissions
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'permissions' 
            AND policyname = 'Owners and users can revoke permissions'
        ) THEN
            CREATE POLICY "Owners and users can revoke permissions" ON permissions
            FOR DELETE USING (
                user_id = auth.uid()
                OR
                granted_by = auth.uid()
                OR
                (resource_type = 'folder' AND resource_id IN (
                    SELECT id FROM folders WHERE user_id = auth.uid()
                ))
                OR
                (resource_type = 'notebook' AND resource_id IN (
                    SELECT id FROM notebooks WHERE user_id = auth.uid()
                ))
            );
        END IF;
    END IF;
END $$;

-- ========================================
-- 4. SHARE INVITATIONS POLICIES
-- ========================================

-- Only add if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'share_invitations') THEN
        -- Users can view invitations they sent or received
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'share_invitations' 
            AND policyname = 'Users can view relevant invitations'
        ) THEN
            CREATE POLICY "Users can view relevant invitations" ON share_invitations
            FOR SELECT USING (
                invited_by = auth.uid()
                OR
                invited_email IN (
                    SELECT email FROM profiles WHERE id = auth.uid()
                )
            );
        END IF;

        -- Users can create invitations for resources they own
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'share_invitations' 
            AND policyname = 'Resource owners can create invitations'
        ) THEN
            CREATE POLICY "Resource owners can create invitations" ON share_invitations
            FOR INSERT WITH CHECK (
                invited_by = auth.uid()
                AND (
                    (resource_type = 'folder' AND resource_id IN (
                        SELECT id FROM folders WHERE user_id = auth.uid()
                    ))
                    OR
                    (resource_type = 'notebook' AND resource_id IN (
                        SELECT id FROM notebooks WHERE user_id = auth.uid()
                    ))
                )
            );
        END IF;

        -- Recipients can accept invitations
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'share_invitations' 
            AND policyname = 'Recipients can accept invitations'
        ) THEN
            CREATE POLICY "Recipients can accept invitations" ON share_invitations
            FOR UPDATE USING (
                invited_email IN (
                    SELECT email FROM profiles WHERE id = auth.uid()
                )
            );
        END IF;

        -- Users can delete relevant invitations
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'share_invitations' 
            AND policyname = 'Users can delete relevant invitations'
        ) THEN
            CREATE POLICY "Users can delete relevant invitations" ON share_invitations
            FOR DELETE USING (
                invited_by = auth.uid()
                OR
                invited_email IN (
                    SELECT email FROM profiles WHERE id = auth.uid()
                )
            );
        END IF;
    END IF;
END $$;

-- ========================================
-- 5. UPDATE NOTES POLICIES FOR FOLDER SHARING
-- ========================================

-- Add policy for notes in notebooks that are in shared folders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notes' 
        AND policyname = 'Users can view notes in notebooks within shared folders'
    ) THEN
        CREATE POLICY "Users can view notes in notebooks within shared folders" ON notes
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM notebooks n
                WHERE n.id = notes.notebook_id
                AND has_permission('folder', n.folder_id, auth.uid(), 'read')
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notes' 
        AND policyname = 'Users can edit notes in notebooks within shared folders with write permission'
    ) THEN
        CREATE POLICY "Users can edit notes in notebooks within shared folders with write permission" ON notes
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM notebooks n
                WHERE n.id = notes.notebook_id
                AND has_permission('folder', n.folder_id, auth.uid(), 'write')
            )
        );
    END IF;
END $$;