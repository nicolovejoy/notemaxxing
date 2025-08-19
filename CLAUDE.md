# Claude Guidelines - Notemaxxing

## Project Status

- **Build**: ✅ PASSING (with warnings)
- **Database**: `dvuvhfjbjoemtoyfjjsg`
- **Sharing**: ✅ WORKING

## Architecture Rules

### 1. Database

- **NO RLS** - Security at API layer only
- **NO triggers/functions** - Set all fields explicitly in code
- **Terraform managed** - Use `/infrastructure/terraform/` for schema changes

### 2. Data Access Pattern

```
Component → API Route → Supabase → Database
```

- **NEVER** use Supabase directly in components
- **ALWAYS** use API routes for database operations
- React Query for fetching, Zustand for complex UI state

### 3. Ownership Model

- `owner_id` - Required on all resources
- `created_by` - User who created it
- Notebooks inherit folder's `owner_id`
- Notes inherit notebook's `owner_id`

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

1. **Be concise** - Short responses, minimal explanation
2. **TypeScript** - Use proper types, avoid `any`
3. **Format** - Run `npm run format` after changes
4. **Build** - Must pass `npm run build` before pushing

## Current Issues

### Non-Critical

- Real-time sync disconnected (needs Supabase config)
- 7 TypeScript warnings (unused vars)
- Can't move notebooks between folders

### Working Features

- ✅ Folders, notebooks, notes
- ✅ AI enhancement
- ✅ Sharing (invite → accept → access)
- ✅ Admin console
- ✅ Permissions management
