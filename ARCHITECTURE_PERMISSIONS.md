# Permissions & Ownership Architecture

## Core Concepts

### Ownership vs Permissions

- **Ownership**: A relationship between a user and a resource (creator/owner relationship)
- **Permissions**: Access rights that can be granted to any user for any resource
- These are **separate dimensions** - you can have permissions without ownership

### Key Principles

1. **Owners always exist** - Every resource has at least one owner
2. **Permissions are flexible** - Owners can grant any permission level, including ownership
3. **Self-restriction is allowed** - Owners can limit their own permissions temporarily
4. **Explicit over implicit** - Explicit permissions override defaults

## Data Model

### Ownership

```typescript
interface Ownership {
  resource_id: string
  resource_type: 'folder' | 'notebook' | 'note'
  user_id: string
  is_owner: boolean
  created_at: timestamp
}
```

### Permissions

```typescript
interface Permission {
  resource_id: string
  resource_type: 'folder' | 'notebook' | 'note'
  user_id: string
  permission_level: 'none' | 'read' | 'write' | 'admin'
  granted_by: string // who granted this permission
  expires_at?: timestamp // optional expiration
  created_at: timestamp
}
```

## Permission Levels

### 1. **none**

- Explicitly no access (overrides inherited permissions)
- Use case: Temporarily revoke access without deleting permission record

### 2. **read**

- View content
- Navigate through structure
- Cannot modify anything

### 3. **write**

- All read permissions
- Edit content
- Create child resources
- Cannot delete or share

### 4. **admin**

- All write permissions
- Delete resources
- Share with others
- Manage permissions
- Transfer ownership

## Permission Resolution Rules

### Order of Precedence (highest to lowest)

1. **Explicit permission** on the exact resource
2. **Inherited permission** from parent (if more restrictive)
3. **Ownership default** (admin level)
4. **No access**

### Resolution Algorithm

```typescript
function getEffectivePermission(user_id, resource) {
  // 1. Check explicit permission on this resource
  const explicit = getPermission(user_id, resource.id)
  if (explicit) {
    return explicit.permission_level
  }

  // 2. Check ownership
  if (isOwner(user_id, resource.id)) {
    // Check if owner has self-restricted
    const selfRestriction = getPermission(user_id, resource.id)
    return selfRestriction?.permission_level || 'admin'
  }

  // 3. Check inherited from parent
  if (resource.parent_id) {
    const parentPerm = getEffectivePermission(user_id, resource.parent)
    // Can't inherit better than write (admin is never inherited)
    return parentPerm === 'admin' ? 'write' : parentPerm
  }

  // 4. No access
  return 'none'
}
```

## Sharing Models

### 1. **Individual Sharing**

Grant specific permission to specific user:

```typescript
shareResource({
  resource_id: 'notebook-123',
  user_email: 'friend@example.com',
  permission_level: 'read',
})
```

### 2. **Co-ownership**

Make someone else an owner too:

```typescript
addOwner({
  resource_id: 'folder-456',
  user_email: 'partner@example.com',
})
// They become full owner with admin rights by default
```

### 3. **Public Links** (future)

Generate shareable links with embedded permissions:

```typescript
createPublicLink({
  resource_id: 'note-789',
  permission_level: 'read',
  expires_at: '2024-12-31',
})
```

## Resource States

### Visibility States

- **active**: Normal visible state
- **archived**: Hidden from default views but still accessible
- **deleted**: Soft deleted, recoverable within 30 days
- **purged**: Hard deleted, non-recoverable

### Access States

- **locked**: Read-only for everyone (including owners)
- **unlocked**: Normal permission rules apply

### State Combinations

| Visibility | Access   | Result                                |
| ---------- | -------- | ------------------------------------- |
| active     | unlocked | Normal access based on permissions    |
| active     | locked   | Read-only for everyone                |
| archived   | unlocked | Hidden but accessible via direct link |
| archived   | locked   | Hidden and read-only                  |
| deleted    | any      | Only owners can recover               |

## Inheritance Rules

### Folder → Notebook → Note

1. **Default Inheritance**
   - Child resources inherit parent permissions by default
   - Inheritance is calculated at access time, not stored

2. **Override Rules**
   - Child can have MORE restrictive permissions than parent
   - Child CANNOT have less restrictive permissions than parent
   - Exception: Explicit permission grants can override

3. **Examples**
   ```
   Folder (write) → Notebook (inherit:write) → Note (inherit:write) ✅
   Folder (write) → Notebook (read) → Note (inherit:read) ✅
   Folder (read) → Notebook (write) → Note (write) ❌ Invalid
   Folder (read) + Explicit Notebook Permission (write) → Note (write) ✅
   ```

## Special Scenarios

### 1. Self-Restriction

Owner wants to make their own notebook read-only:

```typescript
setPermission({
  resource_id: 'my-notebook',
  user_id: 'self',
  permission_level: 'read',
})
// This creates an explicit permission that overrides ownership default
```

### 2. Orphaned Resources

Shared notebook whose parent folder is not shared:

- Notebook appears in "Shared with Me" section
- No folder context shown
- Permissions work normally on the notebook

### 3. Permission Conflicts

User has multiple permission paths to a resource:

- Through folder: `write`
- Direct notebook permission: `read`
- Resolution: Take the explicit permission (`read`)

### 4. Ownership Transfer

```typescript
transferOwnership({
  resource_id: 'folder-123',
  from_user: 'original-owner',
  to_user: 'new-owner',
  keep_original_as: 'admin', // or 'write', 'read', 'none'
})
```

## Permission Checking

### API Level

Every API endpoint must check:

```typescript
async function checkAccess(user_id, resource_id, required_level) {
  const effectivePerm = await getEffectivePermission(user_id, resource_id)
  return hasRequiredLevel(effectivePerm, required_level)
}
```

### UI Level

Show/hide elements based on permissions:

```typescript
{canEdit && <EditButton />}
{canShare && <ShareButton />}
{canDelete && <DeleteButton />}
```

## Audit & History

Track all permission changes:

```typescript
interface PermissionAudit {
  id: string
  action: 'grant' | 'revoke' | 'modify'
  resource_id: string
  resource_type: string
  user_id: string // who received permission
  granted_by: string // who made the change
  old_permission?: string
  new_permission: string
  timestamp: timestamp
  reason?: string
}
```

## Future Considerations

1. **Team/Group Permissions**: Share with entire teams
2. **Role-Based Access**: Define roles with permission sets
3. **Time-Based Access**: Temporary permissions that expire
4. **Conditional Access**: Permissions based on conditions
5. **Public Sharing**: Share with anyone via link
6. **Comments/Suggestions**: Comment-only permission level

## Database Schema Requirements

### Tables Needed

1. `ownership` - Track owners of resources
2. `permissions` - Track all permission grants
3. `permission_audit` - Track permission changes
4. `resource_states` - Track archived/locked states

### Indexes Needed

- `(user_id, resource_id, resource_type)` - Fast permission lookups
- `(resource_id, resource_type)` - Find all permissions for resource
- `(user_id)` - Find all resources for user

## Summary

This architecture provides:

- **Clear separation** between ownership and permissions
- **Flexible sharing** with multiple permission levels
- **Self-restriction** capability for owners
- **Inheritance** with override capability
- **Audit trail** for compliance and debugging
- **Future extensibility** for advanced features
