-- Move public tables to public schema with prefix (workaround for PostgREST limitation)
-- PostgREST only exposes 'public' and 'graphql_public' schemas by default

-- Drop the old tables if they exist
DROP TABLE IF EXISTS public_store.invitation_previews CASCADE;
DROP TABLE IF EXISTS invitation_details CASCADE;
DROP FUNCTION IF EXISTS create_invitation CASCADE;
DROP FUNCTION IF EXISTS accept_invitation CASCADE;

-- 1. Create public invitation preview table (no RLS, in public schema with prefix)
CREATE TABLE public_invitation_previews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('folder', 'notebook')),
    resource_name TEXT NOT NULL,
    permission_level TEXT NOT NULL CHECK (permission_level IN ('read', 'write', 'admin')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- No RLS on public table
ALTER TABLE public_invitation_previews DISABLE ROW LEVEL SECURITY;

-- Grant access to all
GRANT ALL ON public_invitation_previews TO anon, authenticated;

-- 2. Private invitation details (with RLS)
CREATE TABLE invitation_details (
    id UUID PRIMARY KEY REFERENCES public_invitation_previews(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL,
    invitee_email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    accepted_by UUID REFERENCES auth.users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(resource_id, invitee_email)
);

-- Enable RLS
ALTER TABLE invitation_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view invitations they created"
ON invitation_details FOR SELECT
TO authenticated
USING (invited_by = auth.uid());

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

CREATE POLICY "Users can create invitation details"
ON invitation_details FOR INSERT
TO authenticated
WITH CHECK (invited_by = auth.uid());

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
WITH CHECK (accepted_by = auth.uid());

-- 3. Function to create invitation
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
    v_invitation_id := gen_random_uuid();
    v_expires_at := NOW() + INTERVAL '7 days';
    
    -- Insert public preview
    INSERT INTO public_invitation_previews (
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

-- 4. Function to accept invitation
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
    JOIN public_invitation_previews p ON p.id = i.id
    WHERE i.id = p_invitation_id
    AND LOWER(i.invitee_email) = LOWER(v_user_email);
    
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
    UPDATE public_invitation_previews 
    SET status = 'accepted' 
    WHERE id = p_invitation_id;
    
    UPDATE invitation_details 
    SET accepted_by = p_user_id, accepted_at = NOW() 
    WHERE id = p_invitation_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up the unused schema
DROP SCHEMA IF EXISTS public_store CASCADE;