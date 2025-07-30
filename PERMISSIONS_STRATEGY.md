# Permissions & Admin Access Strategy

## Current Implementation (Temporary)

The admin console currently uses a hardcoded email list in the component:

```typescript
const ADMIN_EMAILS = ['nicolovejoy@gmail.com']
```

This is **NOT secure** for production because:

1. Client-side code can be inspected
2. Email addresses can be spoofed
3. No server-side validation
4. No audit trail

## Recommended Production Implementation

### 1. Database-Driven Permissions

Create a `user_roles` table:

```sql
CREATE TABLE user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'super_admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, role)
);

-- RLS Policy: Only admins can read/write
CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

### 2. Server-Side Validation

Create Edge Functions for admin operations:

```typescript
// supabase/functions/admin-seed-user/index.ts
export async function handler(req: Request) {
  const { user } = await requireAdmin() // Throws if not admin
  const { targetUserId } = await req.json()

  // Perform admin operation
  await seedUserData(targetUserId)

  // Log admin action
  await logAdminAction(user.id, 'seed_user', targetUserId)
}
```

### 3. Role-Based Access Control (RBAC)

Define permission levels:

- **User**: Basic app access
- **Moderator**: Can view aggregate stats
- **Admin**: Can manage user data
- **Super Admin**: Can manage other admins

### 4. Audit Trail

Create an audit log:

```sql
CREATE TABLE admin_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Implementation Steps

### Phase 1: Server-Side Admin Check (Priority)

1. Create `user_roles` table
2. Add your user ID as admin
3. Create RPC function to check admin status
4. Update admin console to use server check

### Phase 2: Admin API (Security)

1. Create Edge Functions for admin operations
2. Move all admin logic server-side
3. Add request validation and rate limiting
4. Implement audit logging

### Phase 3: UI Improvements

1. Create admin dashboard at `/admin`
2. Add role management UI
3. Add audit log viewer
4. Add admin notifications

## Security Best Practices

1. **Never trust client-side checks** - Always validate on server
2. **Use Row Level Security** - Protect admin tables with RLS
3. **Audit everything** - Log all admin actions
4. **Principle of least privilege** - Give minimum required permissions
5. **Time-limited access** - Consider expiring admin roles
6. **Two-factor authentication** - Require 2FA for admins

## Quick Fix for Now

While the email check works for development, before going to production:

1. At minimum, move the check to an environment variable:

   ```typescript
   const ADMIN_IDS = process.env.NEXT_PUBLIC_ADMIN_IDS?.split(',') || []
   ```

2. Better: Create a simple RPC function:

   ```sql
   CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
   RETURNS BOOLEAN AS $$
   BEGIN
     -- Hardcode for now, move to table later
     RETURN check_user_id = 'your-user-id-here';
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

3. Best: Implement the full RBAC system above

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions](https://supabase.com/docs/guides/functions)
