# Sharing Feature Implementation Plan

## Updated Philosophy

Based on SHARING_UX_PHILOSOPHY.md:

- **Inheritance by default** - Folder permissions cascade to notebooks
- **Route restructuring** - `/backpack` → `/folders/[id]` → `/notebooks/[id]`
- **Actions on detail pages only** - No share buttons on cards
- **Conflict detection** - Warn when notebook permissions differ from folder

## Current Status

- ShareDialog component exists and looks functional
- ShareButton component exists and integrates with ShareDialog
- Sharing API endpoints exist (`/api/shares/*`)
- Database has permission tables from migration
- Share buttons currently on cards (needs moving to headers)

## Investigation Needed

1. Check where ShareButton is used and why it's disabled
2. Review share invitation flow (`/share/[id]/page.tsx`)
3. Check if API endpoints are working
4. Verify permission system integration with React Query

## Incremental Implementation Plan

### Phase 1: Route Restructuring (Day 1)

- [ ] Rename `/folders` → `/backpack`
- [ ] Fix `/notebooks/[id]` to actually be `/folders/[id]`
- [ ] Update all navigation links
- [ ] Test existing functionality still works

### Phase 2: Move Share Actions to Headers (Day 2)

- [ ] Remove ShareButton from NotebookCard
- [ ] Add ShareButton to folder detail page header
- [ ] Add ShareButton to notebook detail page header (create if needed)
- [ ] Keep share indicators on cards

### Phase 3: Permission Inheritance (Day 3-4)

- [ ] Update database to support inheritance
- [ ] API: When fetching notebooks, check folder permissions
- [ ] API: Flag notebooks with explicit overrides
- [ ] UI: Show inheritance in ShareDialog

### Phase 4: Conflict Detection (Day 5)

- [ ] When sharing folder, check all notebook permissions
- [ ] Show warning dialog if conflicts exist
- [ ] Allow user to proceed or adjust
- [ ] Display conflict badges in UI

### Phase 5: Testing & Polish (Day 6)

- [ ] Test complete sharing flow
- [ ] Add loading states
- [ ] Verify "Shared with Me" works
- [ ] Test permission revocation

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
