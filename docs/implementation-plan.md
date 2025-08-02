# Notemaxxing Implementation Plan

## 1. Fix Data Loading on Login (Production)

### Issue Analysis

The production login flow is failing to load folders after authentication. Based on my research:

- The authentication flow redirects to "/" after successful login (app/auth/login/page.tsx:49)
- StoreProvider initialization has a 100ms delay to ensure auth state is ready (lib/store/StoreProvider.tsx:21)
- Store initialization checks for authenticated user before loading data (lib/store/useStore.ts:636)
- The issue seems to be a race condition where the store tries to initialize before the auth session is fully established

### Root Cause

The middleware handles authentication state on the server side, but the client-side store might be trying to initialize before the auth cookies are properly set after the redirect from login.

### Implementation Steps

1. **Add auth state listener in StoreProvider**
   - Listen for Supabase auth state changes instead of relying on timing
   - Re-initialize store when auth state changes from null to authenticated

2. **Improve error handling and retry logic**
   - Add retry mechanism for store initialization
   - Log more detailed errors to identify production-specific issues

3. **Update login flow**
   - Ensure proper session refresh after login
   - Consider using `router.replace()` instead of `router.push()` to avoid history issues

### Files to modify:

- `lib/store/StoreProvider.tsx` - Add auth state listener
- `lib/store/useStore.ts` - Add retry logic to initializeStore
- `app/auth/login/page.tsx` - Update redirect logic

## 2. Implement Sharing Features

### Database Schema

The database already has the necessary tables for sharing:

- `share_invitations` - Tracks pending share invitations
- `permissions` - Stores accepted shares with read/write permissions

### Implementation Steps

1. **Backend API Routes**
   - Create `/api/shares/invite` - Send share invitations
   - Create `/api/shares/accept` - Accept share invitations
   - Create `/api/shares/list` - List shared resources
   - Create `/api/shares/revoke` - Revoke permissions

2. **Update Supabase RLS Policies**
   - Modify folder/notebook queries to include shared resources
   - Add policies for share_invitations and permissions tables

3. **Frontend Components**
   - Share dialog component with email input and permission selector
   - Shared resources indicator on folders/notebooks
   - Manage permissions dialog for resource owners
   - Accept invitation flow for recipients

4. **Store Updates**
   - Add shared resources to store state
   - Create actions for sharing operations
   - Update data fetching to include shared resources

### Files to create:

- `app/api/shares/invite/route.ts`
- `app/api/shares/accept/route.ts`
- `app/api/shares/list/route.ts`
- `app/api/shares/revoke/route.ts`
- `components/ShareDialog.tsx`
- `components/SharedIndicator.tsx`
- `components/ManagePermissions.tsx`

### Files to modify:

- `lib/store/useStore.ts` - Add sharing state and actions
- `lib/store/supabase-helpers.ts` - Update queries for shared resources
- `components/cards/EntityCard.tsx` - Add share button
- `app/folders/page.tsx` - Show shared folders
- `app/notebooks/[id]/page.tsx` - Show shared notebooks

### Security Considerations

- Validate user permissions before allowing access
- Ensure owners can't be removed from their own resources
- Implement proper email validation for invitations
- Add rate limiting for invitation sending

## Priority Order

1. Fix production login issue first (critical bug affecting all users)
2. Implement sharing features second (new feature request)

## Testing Strategy

### Login Fix Testing

1. Test in development with production-like delays
2. Test with slow network conditions
3. Verify data loads correctly after login
4. Test logout/login cycles

### Sharing Feature Testing

1. Unit tests for permission logic
2. Integration tests for API routes
3. E2E tests for full sharing flow
4. Security testing for unauthorized access attempts
