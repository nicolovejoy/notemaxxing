# Sharing & Visibility Status - January 17, 2025

## Core Issues to Resolve

### 1. Individual Notebook Sharing Within Shared Folders

**Current Problem:**

- User A shares a folder with User B
- User A can "share" individual notebooks within that folder
- But changes to individual notebook permissions don't affect User B
- User B's access is controlled entirely by folder-level permission

**Design Question:**
Should individual notebook sharing within a shared folder:

- A) Be disabled (folder sharing controls everything)?
- B) Allow restricting specific notebooks (remove access)?
- C) Allow different permission levels per notebook?

### 2. Inconsistent "Shared by me" Indicators

**Current State:**

- Folder shows "Shared by me" correctly when shared
- Only 1 of 3 notebooks shows "Shared by me" (likely a query issue)
- The API checks `granted_by` but might miss some records

**Fix Needed:**

- Debug why some notebooks don't show as shared
- Ensure consistent query logic across all shared resources

### 3. Permission Cascade Logic

**Working:**

- Folder permission changes cascade to all notebooks ✅
- User B sees updated permissions (after refresh) ✅

**Unclear:**

- What happens when folder is unshared?
- Should notebook-level permissions be preserved or deleted?
- How to handle conflicting permissions?

### 4. UI/UX Clarity Issues

**Current Confusion:**

- Share button appears on notebooks in shared folders
- But clicking it and "sharing" doesn't actually affect access
- No visual distinction between folder-inherited vs direct permissions

**Needed:**

- Clear indication when permissions are inherited from folder
- Disable or modify notebook sharing UI when in shared folder
- Show permission source (folder vs direct)

## DECIDED APPROACH: Move-to-Control Model

### The Solution: Folders as Access Boundaries

**Core Principle:** Folders define access. To change what's shared, move notebooks between folders.

**Rules:**

1. Folders have ONE permission level for everything inside
2. No individual notebook permissions within shared folders
3. Only owners can move notebooks between folders
4. Users organize by access: "Shared Work", "Private", "Archive" folders
5. **Notes inherit notebook permissions** (which inherit from folder)
   - Folder (read) → Notebook (read) → Notes (read-only)
   - Folder (write) → Notebook (write) → Notes (can create/edit/delete)

**Why This Works:**

- Dead simple mental model (like physical filing cabinets)
- Visual organization matches access control
- No permission inheritance confusion
- Prevents notebook "theft" (can't move what you don't own)

### Implementation Plan (~3 hours)

1. **Add Move Notebook Feature**
   - `PATCH /api/notebooks/[id]/move` endpoint
   - Check: user owns both notebook AND target folder
   - Update `notebook.folder_id` in database

2. **Update UI**
   - Remove individual notebook sharing in shared folders
   - Add "Move to folder" option (owners only)
   - Show "Inherited from folder" badge
   - Disable share button on notebooks in shared folders

3. **Note Access Already Works!**
   - Current code already checks notebook permissions
   - `(!notebook.shared || notebook.permission === 'write')` for edit
   - This naturally inherits from folder → notebook chain
   - No changes needed for notes!

4. **Fix Current Issues**
   - Debug why only 1/3 notebooks show "Shared by me"
   - Remove orphaned notebook permissions
   - Clear up permission cascade logic

## Next Session Priorities

1. **Implement move notebook feature**
2. **Remove individual notebook sharing UI**
3. **Fix "Shared by me" detection bug**
4. **Create About/Help page**
   - Explain the folder-based sharing model
   - "How Sharing Works" section with examples
   - Visual guide showing folder → notebook → notes hierarchy
   - FAQ for common scenarios
5. **Test the new model thoroughly**
