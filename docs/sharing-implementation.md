# Sharing Features Implementation Plan

## Overview

Implement the ability to share folders and notebooks with other users, with read/write permissions.

## Database Schema (Already Exists)

```sql
-- share_invitations table
- id: UUID
- resource_type: 'folder' | 'notebook'
- resource_id: UUID
- invited_email: TEXT
- permission: 'read' | 'write'
- invited_by: UUID (user who sent invitation)
- created_at: TIMESTAMP
- expires_at: TIMESTAMP (7 days default)
- accepted_at: TIMESTAMP (null until accepted)

-- permissions table
- id: UUID
- resource_type: 'folder' | 'notebook'
- resource_id: UUID
- user_id: UUID (user who has access)
- permission: 'read' | 'write'
- granted_by: UUID
- created_at: TIMESTAMP
```

## Implementation Phases

### Phase 1: Backend API Routes

1. **POST /api/shares/invite**
   - Send invitation email
   - Create share_invitations record
   - Validate resource ownership

2. **POST /api/shares/accept**
   - Accept invitation
   - Create permissions record
   - Mark invitation as accepted

3. **GET /api/shares/list**
   - List all shared resources
   - Include both owned shares and received shares

4. **DELETE /api/shares/revoke**
   - Remove permissions
   - Only owners can revoke

### Phase 2: Update Data Loading

1. **Modify Supabase queries** to include:
   - Folders/notebooks user owns
   - Folders/notebooks shared with user
   - Proper permission filtering

2. **Update RLS policies** to allow:
   - Read access for users with permissions
   - Write access based on permission level

### Phase 3: UI Components

1. **ShareButton component**
   - Opens share dialog
   - Shows on folders/notebooks user owns

2. **ShareDialog component**
   - Email input with validation
   - Permission selector (read/write)
   - List of current shares with revoke option

3. **SharedIndicator component**
   - Visual indicator for shared items
   - Shows permission level

4. **Invitation acceptance flow**
   - Email notification (optional for MVP)
   - In-app notification/banner
   - Accept/decline interface

### Phase 4: Store Updates

1. **Add to store state**:

   ```typescript
   sharedFolders: Folder[]
   sharedNotebooks: Notebook[]
   permissions: Permission[]
   invitations: ShareInvitation[]
   ```

2. **Add actions**:
   - sendInvitation
   - acceptInvitation
   - revokePermission
   - loadSharedResources

## Security Considerations

1. **Ownership validation** - Can't share what you don't own
2. **Permission cascading** - Folder permissions apply to notebooks
3. **Email verification** - Ensure invites go to real users
4. **Rate limiting** - Prevent spam invitations
5. **Audit trail** - Track who shared what with whom

## UI/UX Flow

### Sharing a Resource

1. User clicks share button on folder/notebook
2. Modal opens with email input
3. User enters email and selects permission
4. System sends invitation
5. UI shows pending invitation

### Accepting a Share

1. User receives email or sees in-app notification
2. Clicks accept link/button
3. System creates permission record
4. Shared resource appears in user's list

## Testing Strategy

1. **Unit tests** for permission logic
2. **API tests** for all endpoints
3. **UI tests** for share flows
4. **Security tests** for unauthorized access
5. **Performance tests** for large permission sets

## Next Steps

1. Start with API routes (most critical)
2. Update database queries
3. Build UI components
4. Integration testing
