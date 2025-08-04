# Sharing System Test Plan

## Prerequisites

1. Run `scripts/fix-sharing-production.sql` in Supabase SQL Editor
2. Have two test accounts ready (or create them)

## Test 1: Basic Folder Sharing

1. **Account A**: Create a new folder "Test Shared Folder"
2. **Account A**: Click share button on the folder
3. **Account A**: Enter Account B's email and select "Can view"
4. **Account A**: Generate invitation link and copy it
5. **Account B**: Open the invitation link
6. **Account B**: Accept the invitation
7. **Account B**: Verify the folder appears in their folders list with a shared indicator
8. **Account B**: Verify they can view notebooks in the shared folder
9. **Account B**: Verify they cannot edit the folder name

## Test 2: Write Permission Sharing

1. **Account A**: Share another folder with Account B with "Can edit" permission
2. **Account B**: Accept the invitation
3. **Account B**: Try to rename the shared folder
4. **Account B**: Try to create a notebook in the shared folder
5. **Account B**: Verify both operations succeed

## Test 3: Notebook Sharing

1. **Account A**: Share a specific notebook with Account B
2. **Account B**: Accept and verify they can see the notebook
3. **Account B**: Verify they can see notes in the shared notebook
4. **Account B**: Verify the parent folder does NOT appear (only the notebook)

## Test 4: Revoke Access

1. **Account A**: Open share dialog for previously shared folder
2. **Account A**: Click trash icon next to Account B's access
3. **Account B**: Refresh and verify the folder no longer appears

## Test 5: Edge Cases

1. Try to share with yourself (should be blocked)
2. Try to accept an already accepted invitation
3. Let an invitation expire (wait 7 days or modify expires_at in DB)
4. Try to share a resource you don't own

## Expected Issues to Watch For

- Loading delays when opening share dialog (if share metadata not loaded)
- Shared resources not appearing immediately (may need refresh)
- Permission inheritance (notebooks in shared folders)

## Success Criteria

- [ ] All basic sharing flows work without errors
- [ ] Permissions are enforced correctly (read vs write)
- [ ] Shared indicators appear on shared resources
- [ ] Revocation removes access immediately
- [ ] No console errors during the process
