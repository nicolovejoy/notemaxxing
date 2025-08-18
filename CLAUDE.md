# Claude AI Assistant Guidelines

## Quick Reference

**Build Status**: ✅ PASSING  
**Project**: Supabase `vtaloqvkvakylrgpqcml`  
**Branch**: `infra/database-as-code`

## Core Rules

### 1. Architecture Requirements

- **NO direct Supabase calls in components** - Use API routes only
- **NO database triggers** - Set owner_id/created_by explicitly
- **Use React Query** for data fetching, not direct store access
- **Use ViewStore** only for complex UI state (editor)

### 2. Coding Standards

- Be succinct - keep responses short
- Run `npm run format` after changes
- Follow existing patterns in codebase
- Ask before major changes

### 3. Resource Creation Pattern

```typescript
// Folders: owner_id = current user
// Notebooks: owner_id = folder.owner_id
// Notes: owner_id = notebook.owner_id
```

## Common Tasks

### Running Locally

```bash
npm run dev          # Start dev server
npm run type-check   # Check types
npm run build        # Build for prod
```

### Testing Checklist

1. Create folder → sets owner_id to user
2. Create notebook → inherits folder's owner_id
3. Create note → inherits notebook's owner_id
4. Share folder → permissions cascade correctly

## UI Components

Use only existing components from `/components/ui/`:

- Button, Card, Modal, Dropdown
- FormField, SearchInput, SelectField
- PageHeader, Breadcrumb, Skeleton
- LoadingButton, StatusMessage

## Known Issues

1. **ShareDialog.tsx:318** - Direct Supabase call (needs API route)
2. **Admin Console** - Disabled, needs API routes rewrite
3. **Performance** - Large notebooks need pagination

## File Structure

```
/app/api/        → API routes (all data ops)
/app/(pages)/    → Page components
/components/     → React components
/lib/store/      → State management
/lib/query/      → React Query hooks
/infrastructure/  → Database as code (Atlas + Terraform)
```

## Database Management

### Infrastructure as Code
- **Atlas + Terraform** for schema management (tables, indexes)
- **Views** in `infrastructure/atlas/views.sql` (separate from Atlas)
- **CRITICAL**: Atlas excludes Supabase system schemas (auth, storage, etc)

### Schema Changes
1. Edit `infrastructure/atlas/schema.hcl` for tables
2. Edit `infrastructure/atlas/views.sql` for views
3. Run `terraform plan` in `infrastructure/terraform/`
4. Apply with `terraform apply`

### Important Notes
- **NEVER** let Atlas manage Supabase system schemas
- Views require Atlas Pro ($9/month), so we manage them separately
- Always test schema changes locally first

## Documentation

- **Technical**: See PROJECT.md
- **UI Guide**: See DESIGN_SYSTEM.md
- **User Guide**: See README.md
