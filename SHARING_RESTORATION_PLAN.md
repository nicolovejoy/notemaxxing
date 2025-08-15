# Sharing Feature Restoration Plan

## Current Status

- ShareDialog component exists and looks functional
- ShareButton component exists and integrates with ShareDialog
- Sharing API endpoints exist (`/api/shares/*`)
- Database has permission tables from migration
- UI components are currently disabled/hidden

## Investigation Needed

1. Check where ShareButton is used and why it's disabled
2. Review share invitation flow (`/share/[id]/page.tsx`)
3. Check if API endpoints are working
4. Verify permission system integration with React Query

## Implementation Plan

### Phase 1: Enable Basic Sharing UI

- [ ] Re-enable ShareButton in NotebookCard component
- [ ] Re-enable ShareButton in folder views
- [ ] Test ShareDialog opens correctly
- [ ] Verify share link generation works

### Phase 2: Fix Share Invitation Flow

- [ ] Test `/share/[id]` page for accepting invitations
- [ ] Ensure permissions are properly created
- [ ] Verify shared resources appear in "Shared with Me" page
- [ ] Test permission revocation

### Phase 3: Integrate with React Query

- [ ] Add React Query hooks for sharing operations
- [ ] Ensure real-time updates when permissions change
- [ ] Cache invalidation for shared resources
- [ ] Optimistic updates for share operations

### Phase 4: UI Polish

- [ ] Add loading states for share operations
- [ ] Improve error handling and user feedback
- [ ] Add share indicators to folders/notebooks
- [ ] Show permission level badges

## Technical Components

### Existing Files

- `/components/ShareDialog.tsx` - Main sharing modal
- `/components/ShareButton.tsx` - Trigger button for dialog
- `/components/SharedIndicator.tsx` - Visual indicator for shared items
- `/app/share/[id]/page.tsx` - Accept invitation page
- `/app/shared-with-me/page.tsx` - View shared resources
- `/lib/api/sharing.ts` - Sharing API client

### API Endpoints

- `POST /api/shares/generate-link` - Create invitation
- `GET /api/shares/invitation/[id]` - Get invitation details
- `POST /api/shares/accept` - Accept invitation
- `GET /api/shares/list` - List shared resources
- `POST /api/shares/revoke` - Revoke permission

### Database Tables

- `permissions` - Store granted permissions
- `share_invitations` - Track pending invitations

## Testing Checklist

- [ ] Can create share invitation
- [ ] Can copy share link
- [ ] Can accept invitation from another user
- [ ] Shared resources appear in "Shared with Me"
- [ ] Can revoke permissions
- [ ] Proper error handling for edge cases
- [ ] Real-time sync works across users

## Known Issues to Address

1. ShareButton might be conditionally hidden
2. Need to ensure RLS policies allow sharing
3. Real-time updates for shared resources
4. Permission checks in UI components
