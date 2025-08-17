-- Hybrid Invitation System: Split public/private data
-- Public data: Minimal info for preview (no emails or IDs)
-- Private data: Sensitive info for acceptance (emails, user IDs)

-- 1. Create schema for public data (no RLS)
CREATE SCHEMA IF NOT EXISTS public_store;

-- 2. Public invitations table (minimal data, no sensitive info)
CREATE TABLE public_store.invitation_previews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('folder', 'notebook')),
    resource_name TEXT NOT NULL, -- Just the name, not the ID
    permission_level TEXT NOT NULL CHECK (permission_level IN ('read', 'write', 'admin')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant full access to public schema (no RLS needed)
GRANT ALL ON SCHEMA public_store TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public_store TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public_store TO anon, authenticated;

-- 3. Private invitations table (sensitive data, with RLS)
CREATE TABLE invitation_details (
    id UUID PRIMARY KEY REFERENCES public_store.invitation_previews(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL,
    invitee_email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    accepted_by UUID REFERENCES auth.users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure unique pending invitations per resource/email combo
    UNIQUE(resource_id, invitee_email)
);

-- Enable RLS on private table
ALTER TABLE invitation_details ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for private invitation details

-- Users can see invitations they created
CREATE POLICY "Users can view invitations they created"
ON invitation_details FOR SELECT
TO authenticated
USING (invited_by = auth.uid());

-- Users can see invitations sent to their email
CREATE POLICY "Users can view invitations sent to them"
ON invitation_details FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users u 
        WHERE u.id = auth.uid() 
        AND LOWER(u.email) = LOWER(invitation_details.invitee_email)
    )
);

-- Only the inviter can create invitation details
CREATE POLICY "Users can create invitation details"
ON invitation_details FOR INSERT
TO authenticated
WITH CHECK (invited_by = auth.uid());

-- Users can update invitations sent to them (for acceptance)
CREATE POLICY "Users can accept invitations sent to them"
ON invitation_details FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users u 
        WHERE u.id = auth.uid() 
        AND LOWER(u.email) = LOWER(invitation_details.invitee_email)
    )
)
WITH CHECK (
    -- Can only update accepted_by and accepted_at
    accepted_by = auth.uid()
);

-- 5. Function to create split invitation (atomic operation)
CREATE OR REPLACE FUNCTION create_invitation(
    p_resource_id UUID,
    p_resource_type TEXT,
    p_resource_name TEXT,
    p_invitee_email TEXT,
    p_permission_level TEXT,
    p_invited_by UUID
) RETURNS UUID AS $$
DECLARE
    v_invitation_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate ID and expiry
    v_invitation_id := gen_random_uuid();
    v_expires_at := NOW() + INTERVAL '7 days';
    
    -- Insert public preview data
    INSERT INTO public_store.invitation_previews (
        id, resource_type, resource_name, permission_level, expires_at
    ) VALUES (
        v_invitation_id, p_resource_type, p_resource_name, p_permission_level, v_expires_at
    );
    
    -- Insert private details
    INSERT INTO invitation_details (
        id, resource_id, invitee_email, invited_by
    ) VALUES (
        v_invitation_id, p_resource_id, p_invitee_email, p_invited_by
    );
    
    RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to accept invitation (elevated privileges)
CREATE OR REPLACE FUNCTION accept_invitation(
    p_invitation_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_invitation RECORD;
    v_user_email TEXT;
BEGIN
    -- Get user's email
    SELECT email INTO v_user_email 
    FROM auth.users 
    WHERE id = p_user_id;
    
    -- Get invitation details
    SELECT 
        i.*,
        p.status,
        p.expires_at,
        p.resource_type,
        p.permission_level
    INTO v_invitation
    FROM invitation_details i
    JOIN public_store.invitation_previews p ON p.id = i.id
    WHERE i.id = p_invitation_id
    AND LOWER(i.invitee_email) = LOWER(v_user_email);
    
    -- Validate invitation
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found or not for this user';
    END IF;
    
    IF v_invitation.status != 'pending' THEN
        RAISE EXCEPTION 'Invitation already accepted';
    END IF;
    
    IF v_invitation.expires_at < NOW() THEN
        RAISE EXCEPTION 'Invitation expired';
    END IF;
    
    -- Create permission
    INSERT INTO permissions (
        resource_id,
        resource_type,
        user_id,
        permission_level,
        granted_by
    ) VALUES (
        v_invitation.resource_id,
        v_invitation.resource_type,
        p_user_id,
        v_invitation.permission_level,
        v_invitation.invited_by
    );
    
    -- Update invitation status
    UPDATE public_store.invitation_previews 
    SET status = 'accepted' 
    WHERE id = p_invitation_id;
    
    UPDATE invitation_details 
    SET accepted_by = p_user_id, accepted_at = NOW() 
    WHERE id = p_invitation_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Clean up old policies that were causing issues
DROP POLICY IF EXISTS "Anyone can view invitation basics for preview" ON invitations;
DROP POLICY IF EXISTS "Users can create permissions when accepting invitations" ON permissions;