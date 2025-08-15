-- Permission System Migration
-- This implements the ownership and permissions architecture

-- Drop existing permission-related tables, views, and functions (test data only)
DROP VIEW IF EXISTS shared_resources_with_details CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS share_invitations CASCADE;

-- Drop existing functions that we're replacing
DROP FUNCTION IF EXISTS has_permission CASCADE;
DROP FUNCTION IF EXISTS is_owner CASCADE;
DROP FUNCTION IF EXISTS get_effective_permission CASCADE;
DROP FUNCTION IF EXISTS grant_permission CASCADE;
DROP FUNCTION IF EXISTS transfer_ownership CASCADE;

-- Create enum for resource types
CREATE TYPE resource_type AS ENUM ('folder', 'notebook', 'note');

-- Create enum for permission levels
CREATE TYPE permission_level AS ENUM ('none', 'read', 'write', 'admin');

-- Create enum for resource visibility states
CREATE TYPE visibility_state AS ENUM ('active', 'archived', 'deleted', 'purged');

-- Create enum for resource access states  
CREATE TYPE access_state AS ENUM ('locked', 'unlocked');

-- 1. Ownership table - tracks who owns resources
CREATE TABLE ownership (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL,
    resource_type resource_type NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- Indicates primary owner vs co-owner
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: a user can only have one ownership record per resource
    UNIQUE(resource_id, resource_type, user_id)
);

-- Indexes for ownership table
CREATE INDEX idx_ownership_user ON ownership(user_id);
CREATE INDEX idx_ownership_resource ON ownership(resource_id, resource_type);

-- 2. Permissions table - tracks explicit permissions
CREATE TABLE permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL,
    resource_type resource_type NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_level permission_level NOT NULL,
    granted_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: only one permission record per user per resource
    UNIQUE(resource_id, resource_type, user_id)
);

-- Indexes for permissions table
CREATE INDEX idx_permissions_user ON permissions(user_id);
CREATE INDEX idx_permissions_resource ON permissions(resource_id, resource_type);
CREATE INDEX idx_permissions_expires ON permissions(expires_at) WHERE expires_at IS NOT NULL;

-- 3. Resource states table - tracks visibility and access states
CREATE TABLE resource_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL,
    resource_type resource_type NOT NULL,
    visibility_state visibility_state DEFAULT 'active',
    access_state access_state DEFAULT 'unlocked',
    locked_by UUID REFERENCES auth.users(id),
    locked_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one state record per resource
    UNIQUE(resource_id, resource_type)
);

-- Index for resource states
CREATE INDEX idx_resource_states ON resource_states(resource_id, resource_type);

-- 4. Permission audit table - tracks all permission changes
CREATE TABLE permission_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action VARCHAR(20) NOT NULL CHECK (action IN ('grant', 'revoke', 'modify', 'transfer')),
    resource_id UUID NOT NULL,
    resource_type resource_type NOT NULL,
    user_id UUID NOT NULL, -- Who received/lost permission
    granted_by UUID NOT NULL, -- Who made the change
    old_permission permission_level,
    new_permission permission_level,
    reason TEXT,
    metadata JSONB, -- Additional context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX idx_audit_resource ON permission_audit(resource_id, resource_type);
CREATE INDEX idx_audit_user ON permission_audit(user_id);
CREATE INDEX idx_audit_granted_by ON permission_audit(granted_by);
CREATE INDEX idx_audit_created ON permission_audit(created_at DESC);

-- 5. Invitations table - for sharing with users who don't exist yet
CREATE TABLE invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL,
    resource_type resource_type NOT NULL,
    invitee_email VARCHAR(255) NOT NULL,
    permission_level permission_level NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    transfer_ownership_on_accept BOOLEAN DEFAULT false,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for invitations
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(invitee_email);
CREATE INDEX idx_invitations_expires ON invitations(expires_at);

-- Helper function to check if user is owner
CREATE OR REPLACE FUNCTION is_owner(
    p_user_id UUID,
    p_resource_id UUID,
    p_resource_type resource_type
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ownership
        WHERE user_id = p_user_id
        AND resource_id = p_resource_id
        AND resource_type = p_resource_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get effective permission level
CREATE OR REPLACE FUNCTION get_effective_permission(
    p_user_id UUID,
    p_resource_id UUID,
    p_resource_type resource_type
) RETURNS permission_level AS $$
DECLARE
    v_permission permission_level;
    v_is_owner BOOLEAN;
    v_parent_id UUID;
    v_parent_type resource_type;
    v_parent_permission permission_level;
BEGIN
    -- Check for explicit permission (not expired)
    SELECT permission_level INTO v_permission
    FROM permissions
    WHERE user_id = p_user_id
    AND resource_id = p_resource_id
    AND resource_type = p_resource_type
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF v_permission IS NOT NULL THEN
        RETURN v_permission;
    END IF;
    
    -- Check if user is owner
    v_is_owner := is_owner(p_user_id, p_resource_id, p_resource_type);
    IF v_is_owner THEN
        -- Owners have admin by default unless self-restricted
        RETURN 'admin';
    END IF;
    
    -- Check inherited permissions from parent
    IF p_resource_type = 'note' THEN
        -- Get parent notebook
        SELECT notebook_id INTO v_parent_id FROM notes WHERE id = p_resource_id;
        v_parent_type := 'notebook';
    ELSIF p_resource_type = 'notebook' THEN
        -- Get parent folder
        SELECT folder_id INTO v_parent_id FROM notebooks WHERE id = p_resource_id;
        v_parent_type := 'folder';
    END IF;
    
    IF v_parent_id IS NOT NULL THEN
        v_parent_permission := get_effective_permission(p_user_id, v_parent_id, v_parent_type);
        -- Admin permission is not inherited, downgrade to write
        IF v_parent_permission = 'admin' THEN
            RETURN 'write';
        ELSE
            RETURN v_parent_permission;
        END IF;
    END IF;
    
    -- No access
    RETURN 'none';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has required permission level
CREATE OR REPLACE FUNCTION has_permission(
    p_user_id UUID,
    p_resource_id UUID,
    p_resource_type resource_type,
    p_required_level permission_level
) RETURNS BOOLEAN AS $$
DECLARE
    v_effective_permission permission_level;
BEGIN
    v_effective_permission := get_effective_permission(p_user_id, p_resource_id, p_resource_type);
    
    -- Permission hierarchy: none < read < write < admin
    RETURN CASE
        WHEN p_required_level = 'none' THEN TRUE
        WHEN p_required_level = 'read' THEN v_effective_permission IN ('read', 'write', 'admin')
        WHEN p_required_level = 'write' THEN v_effective_permission IN ('write', 'admin')
        WHEN p_required_level = 'admin' THEN v_effective_permission = 'admin'
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant permission
CREATE OR REPLACE FUNCTION grant_permission(
    p_resource_id UUID,
    p_resource_type resource_type,
    p_user_id UUID,
    p_permission_level permission_level,
    p_granted_by UUID,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_permission_id UUID;
    v_old_permission permission_level;
BEGIN
    -- Check if granter has admin permission
    IF NOT has_permission(p_granted_by, p_resource_id, p_resource_type, 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions to grant access';
    END IF;
    
    -- Get existing permission if any
    SELECT permission_level INTO v_old_permission
    FROM permissions
    WHERE resource_id = p_resource_id
    AND resource_type = p_resource_type
    AND user_id = p_user_id;
    
    -- Insert or update permission
    INSERT INTO permissions (
        resource_id, resource_type, user_id, 
        permission_level, granted_by, expires_at
    ) VALUES (
        p_resource_id, p_resource_type, p_user_id,
        p_permission_level, p_granted_by, p_expires_at
    )
    ON CONFLICT (resource_id, resource_type, user_id)
    DO UPDATE SET
        permission_level = EXCLUDED.permission_level,
        granted_by = EXCLUDED.granted_by,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    RETURNING id INTO v_permission_id;
    
    -- Log to audit
    INSERT INTO permission_audit (
        action, resource_id, resource_type, user_id,
        granted_by, old_permission, new_permission
    ) VALUES (
        CASE WHEN v_old_permission IS NULL THEN 'grant' ELSE 'modify' END,
        p_resource_id, p_resource_type, p_user_id,
        p_granted_by, v_old_permission, p_permission_level
    );
    
    RETURN v_permission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transfer ownership
CREATE OR REPLACE FUNCTION transfer_ownership(
    p_resource_id UUID,
    p_resource_type resource_type,
    p_from_user UUID,
    p_to_user UUID,
    p_keep_original_permission permission_level DEFAULT 'admin'
) RETURNS BOOLEAN AS $$
BEGIN
    -- Verify current owner
    IF NOT is_owner(p_from_user, p_resource_id, p_resource_type) THEN
        RAISE EXCEPTION 'User is not the owner of this resource';
    END IF;
    
    -- Add new owner
    INSERT INTO ownership (resource_id, resource_type, user_id, is_primary)
    VALUES (p_resource_id, p_resource_type, p_to_user, true)
    ON CONFLICT (resource_id, resource_type, user_id)
    DO UPDATE SET is_primary = true;
    
    -- Update original owner
    IF p_keep_original_permission = 'none' THEN
        -- Remove ownership
        DELETE FROM ownership
        WHERE resource_id = p_resource_id
        AND resource_type = p_resource_type
        AND user_id = p_from_user;
    ELSE
        -- Keep as co-owner but not primary
        UPDATE ownership
        SET is_primary = false
        WHERE resource_id = p_resource_id
        AND resource_type = p_resource_type
        AND user_id = p_from_user;
        
        -- Set explicit permission if not admin
        IF p_keep_original_permission != 'admin' THEN
            INSERT INTO permissions (
                resource_id, resource_type, user_id,
                permission_level, granted_by
            ) VALUES (
                p_resource_id, p_resource_type, p_from_user,
                p_keep_original_permission, p_to_user
            )
            ON CONFLICT (resource_id, resource_type, user_id)
            DO UPDATE SET
                permission_level = EXCLUDED.permission_level,
                updated_at = NOW();
        END IF;
    END IF;
    
    -- Log to audit
    INSERT INTO permission_audit (
        action, resource_id, resource_type, user_id,
        granted_by, new_permission, metadata
    ) VALUES (
        'transfer', p_resource_id, p_resource_type, p_to_user,
        p_from_user, 'admin', 
        jsonb_build_object('from_user', p_from_user, 'keep_original', p_keep_original_permission)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing data: Create ownership records for existing resources
-- This assumes current user_id fields represent ownership

-- Migrate folders
INSERT INTO ownership (resource_id, resource_type, user_id, is_primary)
SELECT id, 'folder'::resource_type, user_id, true
FROM folders
ON CONFLICT DO NOTHING;

-- Migrate notebooks  
INSERT INTO ownership (resource_id, resource_type, user_id, is_primary)
SELECT id, 'notebook'::resource_type, user_id, true
FROM notebooks
ON CONFLICT DO NOTHING;

-- Migrate notes
INSERT INTO ownership (resource_id, resource_type, user_id, is_primary)
SELECT n.id, 'note'::resource_type, nb.user_id, true
FROM notes n
JOIN notebooks nb ON n.notebook_id = nb.id
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Ownership: Users can see ownership records for resources they have access to
CREATE POLICY "Users can view relevant ownership records" ON ownership
    FOR SELECT USING (
        auth.uid() = user_id OR
        has_permission(auth.uid(), resource_id, resource_type, 'read')
    );

-- Ownership: Only admins can modify ownership
CREATE POLICY "Only admins can modify ownership" ON ownership
    FOR ALL USING (
        has_permission(auth.uid(), resource_id, resource_type, 'admin')
    );

-- Permissions: Users can see permissions for resources they admin
CREATE POLICY "Users can view permissions they admin" ON permissions
    FOR SELECT USING (
        auth.uid() = user_id OR
        has_permission(auth.uid(), resource_id, resource_type, 'admin')
    );

-- Permissions: Only admins can modify permissions
CREATE POLICY "Only admins can modify permissions" ON permissions
    FOR ALL USING (
        has_permission(auth.uid(), resource_id, resource_type, 'admin')
    );

-- Resource states: Users can see states for resources they can access
CREATE POLICY "Users can view resource states" ON resource_states
    FOR SELECT USING (
        has_permission(auth.uid(), resource_id, resource_type, 'read')
    );

-- Resource states: Only admins can modify states
CREATE POLICY "Only admins can modify resource states" ON resource_states
    FOR ALL USING (
        has_permission(auth.uid(), resource_id, resource_type, 'admin')
    );

-- Audit: Users can see audit logs for resources they admin
CREATE POLICY "Users can view audit logs" ON permission_audit
    FOR SELECT USING (
        has_permission(auth.uid(), resource_id, resource_type, 'admin')
    );

-- Invitations: Users can see invitations they sent or received
CREATE POLICY "Users can view relevant invitations" ON invitations
    FOR SELECT USING (
        auth.uid() = invited_by OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND email = invitations.invitee_email
        )
    );

-- Create views for easier querying

-- View: All resources a user can access
CREATE OR REPLACE VIEW user_accessible_resources AS
SELECT DISTINCT
    COALESCE(o.user_id, p.user_id) as user_id,
    COALESCE(o.resource_id, p.resource_id) as resource_id,
    COALESCE(o.resource_type, p.resource_type) as resource_type,
    get_effective_permission(
        COALESCE(o.user_id, p.user_id),
        COALESCE(o.resource_id, p.resource_id),
        COALESCE(o.resource_type, p.resource_type)
    ) as permission_level,
    CASE WHEN o.user_id IS NOT NULL THEN true ELSE false END as is_owner
FROM ownership o
FULL OUTER JOIN permissions p ON 
    o.resource_id = p.resource_id AND 
    o.resource_type = p.resource_type AND
    o.user_id = p.user_id
WHERE 
    (o.user_id = auth.uid() OR p.user_id = auth.uid())
    AND get_effective_permission(
        COALESCE(o.user_id, p.user_id),
        COALESCE(o.resource_id, p.resource_id),
        COALESCE(o.resource_type, p.resource_type)
    ) != 'none';

-- View: Shared folders (folders user can access but doesn't own)
CREATE OR REPLACE VIEW shared_folders AS
SELECT 
    f.*,
    uar.permission_level,
    uar.is_owner
FROM folders f
JOIN user_accessible_resources uar ON 
    uar.resource_id = f.id AND 
    uar.resource_type = 'folder'
WHERE 
    uar.user_id = auth.uid()
    AND uar.permission_level != 'none';

-- View: Shared notebooks
CREATE OR REPLACE VIEW shared_notebooks AS
SELECT 
    n.*,
    uar.permission_level,
    uar.is_owner
FROM notebooks n
JOIN user_accessible_resources uar ON 
    uar.resource_id = n.id AND 
    uar.resource_type = 'notebook'
WHERE 
    uar.user_id = auth.uid()
    AND uar.permission_level != 'none';

-- Grant necessary permissions to authenticated users
GRANT SELECT ON ownership TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON resource_states TO authenticated;
GRANT SELECT ON permission_audit TO authenticated;
GRANT SELECT, INSERT, UPDATE ON invitations TO authenticated;
GRANT EXECUTE ON FUNCTION is_owner TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_permission TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION grant_permission TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_ownership TO authenticated;
GRANT SELECT ON user_accessible_resources TO authenticated;
GRANT SELECT ON shared_folders TO authenticated;
GRANT SELECT ON shared_notebooks TO authenticated;