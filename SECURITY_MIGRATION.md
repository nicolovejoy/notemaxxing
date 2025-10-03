# Security Migration Plan - Notemaxxing

## Overview

This document outlines the phased approach to enable Row-Level Security (RLS) in Notemaxxing while maintaining the invitation acceptance flow for unauthenticated users.

## Current Security Issues

1. **No RLS enabled** - Database is wide open if API layer is bypassed
2. **Using ANON_KEY in server** - Should use SERVICE_ROLE_KEY for server-side operations
3. **Direct database access from client** - RealtimeManager makes direct queries
4. **Hardcoded admin emails** - Should be in environment variables

## Migration Phases

### Phase 1: Enable RLS with Service Role (COMPLETED)

✅ Created RLS policies in `/infrastructure/rls-policies.sql`
✅ Updated `/lib/supabase/server.ts` to use SERVICE_ROLE_KEY
✅ Preserved anonymous access to `public_invitation_previews` table

**Key Changes:**

- All tables now have RLS enabled EXCEPT `public_invitation_previews`
- Server-side API routes use SERVICE_ROLE_KEY to bypass RLS
- Client-side still uses ANON_KEY with RLS protection

### Phase 2: Apply RLS Policies (READY TO DEPLOY)

To apply the security changes:

```bash
# Option 1: Apply via Supabase Dashboard
# Go to SQL Editor and run the contents of:
cat infrastructure/rls-policies.sql

# Option 2: Apply via Supabase CLI (if configured)
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
```

### Phase 3: Test Invitation Flow (NEXT STEP)

After applying RLS, test:

1. **Anonymous invitation preview** - Should still work (no RLS on preview table)
2. **Authenticated invitation acceptance** - Should work with new permissions
3. **Normal CRUD operations** - Should work via API routes with SERVICE_ROLE_KEY

### Phase 4: Fix RealtimeManager (FUTURE)

The RealtimeManager currently queries permissions directly. Options:

1. Create a public function that returns user's accessible resources
2. Move subscription logic to server and use webhooks
3. Keep as-is but document the read-only nature

### Phase 5: Additional Security Hardening (FUTURE)

1. **Add rate limiting** to API routes
2. **Move admin emails** to environment variables
3. **Add CORS configuration**
4. **Implement request validation middleware**
5. **Add audit logging** for sensitive operations

## Testing Checklist

Before marking complete, verify:

- [ ] Unauthenticated users can preview invitations
- [ ] Authenticated users can accept invitations
- [ ] Folder owners can create/read/update/delete their folders
- [ ] Shared users can access folders based on permissions (read/write)
- [ ] Notebooks inherit folder permissions correctly
- [ ] Notes inherit notebook permissions correctly
- [ ] Admin routes still function with SERVICE_ROLE_KEY

## Rollback Plan

If issues arise after applying RLS:

```sql
-- Disable RLS on all tables (emergency rollback)
ALTER TABLE public.folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "folder_owner_all" ON public.folders;
DROP POLICY IF EXISTS "folder_shared_read" ON public.folders;
DROP POLICY IF EXISTS "folder_shared_write" ON public.folders;
-- ... (drop all other policies)
```

## Important Notes

1. **public_invitation_previews remains without RLS** - This is intentional to allow anonymous users to preview invitations
2. **SERVICE_ROLE_KEY is critical** - Without it, the API routes won't work after RLS is enabled
3. **Test in staging first** - If you have a staging environment, test there before production
4. **Monitor error logs** - Watch for permission denied errors after enabling RLS

## Security Benefits After Migration

1. **Defense in depth** - Even if API layer is compromised, database is protected
2. **Proper key usage** - Service role for server, anon key for client
3. **Granular permissions** - RLS policies match business logic
4. **Audit trail** - Can add logging to track who accesses what

## Next Steps

1. Review the RLS policies in `/infrastructure/rls-policies.sql`
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
3. Apply the RLS policies to your database
4. Test all functionality
5. Monitor for any permission errors

## Questions?

The RLS policies are designed to exactly mirror the existing API-layer security logic. The only behavioral change should be that direct database access (bypassing the API) is now blocked.
