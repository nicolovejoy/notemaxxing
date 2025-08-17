-- Fix type casting in accept_invitation function
-- The permissions table uses enum types, but we're passing text

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
    
    -- Create permission with proper type casting
    INSERT INTO permissions (
        resource_id,
        resource_type,
        user_id,
        permission_level,
        granted_by
    ) VALUES (
        v_invitation.resource_id,
        v_invitation.resource_type::resource_type,  -- Cast text to enum
        p_user_id,
        v_invitation.permission_level::permission_level,  -- Cast text to enum
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