# Sharing Architecture

## Design: Hybrid Public/Private Tables

**Public** (`public_invitation_previews`) - No RLS, for previews
**Private** (`invitation_details`, `permissions`) - RLS protected
**Functions** (`create_invitation`, `accept_invitation`) - SECURITY DEFINER

## Ownership Model

- **Ownership = Container**: Own folder → own everything inside
- **Creator ≠ Owner**: Track who made it, but folder owner owns it
- **Permissions**: Read/write access to things you don't own

## Invitation Flow

1. **Create**: Owner shares folder → `create_invitation()` → link generated
2. **Preview**: Anyone views link → sees public preview (no auth)
3. **Accept**: User logs in → `accept_invitation()` → gets permissions
4. **Access**: User sees shared folder and ALL notebooks inside

## RLS Design (No Circular Dependencies)

```
folders     → permissions ✓
notebooks   → permissions ✓
permissions → NOTHING     ✓
```

**Permissions Table RLS**:

```sql
SELECT: user_id = auth.uid() OR granted_by = auth.uid()
DELETE: granted_by = auth.uid()
```

**Resource Tables RLS**:

```sql
-- Folders: owned or have permission
user_id = auth.uid() OR EXISTS (SELECT 1 FROM permissions...)

-- Notebooks: in owned folder or have folder permission
EXISTS (SELECT 1 FROM folders WHERE user_id = auth.uid()...) OR
EXISTS (SELECT 1 FROM permissions WHERE resource_type = 'folder'...)
```

## Current State

✅ Fixed infinite recursion in RLS
✅ Basic sharing working
❌ No share indicators in UI
❌ Notebook visibility needs fixing (folder owners should see all)
