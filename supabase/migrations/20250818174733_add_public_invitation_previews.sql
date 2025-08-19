-- Create public_invitation_previews table for anonymous invitation preview
CREATE TABLE IF NOT EXISTS public_invitation_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  inviter_name TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_public_invitation_previews_token ON public_invitation_previews(token);

-- Migrate existing invitations that haven't been accepted
INSERT INTO public_invitation_previews (token, resource_name, resource_type, inviter_name, expires_at)
SELECT 
  i.token, 
  COALESCE(f.name, n.name, 'Shared Resource') as resource_name,
  i.resource_type,
  COALESCE(u.email, 'A user') as inviter_name,
  i.expires_at
FROM invitations i
LEFT JOIN folders f ON i.resource_id = f.id AND i.resource_type = 'folder'
LEFT JOIN notebooks n ON i.resource_id = n.id AND i.resource_type = 'notebook'
LEFT JOIN auth.users u ON i.inviter_id = u.id
WHERE i.accepted_at IS NULL
ON CONFLICT (token) DO NOTHING;