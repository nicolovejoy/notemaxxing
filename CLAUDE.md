# Claude Guidelines - Notemaxxing

Quick reference for AI assistants working on this codebase.

## 🚨 SECURITY MIGRATION IN PROGRESS (2025-10-03)

**Current State**: RLS policies created but NOT applied yet

- Database still has NO RLS (vulnerable)
- Server code updated to use SERVICE_ROLE_KEY
- See `/SECURITY_MIGRATION.md` for full details

**Before making changes**: Check if RLS has been applied:

1. Check Supabase dashboard for RLS status
2. If enabled, security is at BOTH API and database layer
3. If disabled, security remains at API layer only

## Critical Rules

### Database

- **RLS Status**: Currently disabled, migration prepared
- **NO triggers/functions** - Set all fields explicitly
- **Terraform managed** - Use `/infrastructure/terraform/` for schema changes

### Data Access Pattern

```
Component → API Route → Supabase → Database
```

- **NEVER** use Supabase directly in components
- **ALWAYS** use API routes for database operations

### Ownership Model

- `owner_id` - Required on all resources
- `created_by` - User who created it
- Notebooks inherit folder's `owner_id`
- Notes inherit notebook's `owner_id`

### Sharing Model

- **FOLDER-ONLY SHARING** - You can ONLY share folders, NOT notebooks or notes
- When a folder is shared, ALL notebooks and notes inside inherit permissions
- Permission levels: `read` (view-only) or `write` (can edit)
- Sharing is email-based with 7-day invitation expiry
- **DO NOT** implement notebook or note sharing - it was removed intentionally

## Common Operations

### Creating Resources

```typescript
// Always set owner_id explicitly
// Folders: owner = current user
// Notebooks: owner = folder.owner_id
// Notes: owner = notebook.owner_id
```

### Making Schema Changes

1. Update `/infrastructure/setup-database.sql`
2. Run `terraform apply` in `/infrastructure/terraform/`

## Coding Standards

1. **Be concise** - Short responses, crisp explanation
2. **Plan, discuss, code** - make a suggestion on your approach to the user before you go nuts coding
3. **TypeScript** - Use proper types, avoid `any`
4. **Format** - Run `npm run format` after changes
5. **Build** - Must pass `npm run build` before pushing

## Current State

- **Database**: `dvuvhfjbjoemtoyfjjsg`
- **Build**: ✅ PASSING (with warnings)
- **Sharing**: ✅ WORKING (UX tweaks needed)

## See Also

- `README.md` - Developer documentation
- `ARCHITECTURE.md` - Technical details
