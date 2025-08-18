# Project Guidelines for Claude

## Current State (August 18, 2024)

### ✅ BUILD STATUS: PASSING

### Database Configuration

- **Database**: DB3-Atlas (`dvuvhfjbjoemtoyfjjsg`)
- **Infrastructure**: Terraform-managed (`/infrastructure/`)
- **RLS**: Disabled (security at API layer)
- **IMPORTANT**: No database triggers - all fields must be set explicitly
- Migration files renamed to `.sql.applied` after running `npx supabase db push`

## Architecture Rules

### Ownership Model

- **owner_id**: Resource owner (required on folders, notebooks, notes)
- **created_by**: User who created the resource
- **Inheritance**: Notebooks inherit folder's owner_id, notes inherit notebook's owner_id
- **No triggers**: Must explicitly set these fields in code

### Data Fetching Pattern

- Use React Query for all data fetching (consistency & caching)
- Use ViewStore/Zustand only for complex editing state (notebook editor)
- No direct Supabase calls in components - use API routes
- Server aggregation for counts, not client-side

### Sharing Model

- **Folder-first**: Share folders, notebooks inherit permissions
- **Move-to-Control**: Move notebooks between folders to control access
- **Only owners can move**: Prevents unauthorized access changes

## Coding Rules

1. **Be succinct** - Keep responses short and focused
2. **Ask before major changes** - Get confirmation for significant modifications
3. **Format code** - Run `npm run format` after changes
4. **Small chunks** - Work incrementally, test frequently
5. **Check existing patterns** - Follow established code patterns

## Common Operations

### Creating Resources

```typescript
// Folders - owner_id is current user
await supabase.from('folders').insert({
  name,
  color,
  owner_id: userId,
})

// Notebooks - inherit folder's owner_id
const folder = await getFolder(folder_id)
await supabase.from('notebooks').insert({
  name,
  color,
  folder_id,
  owner_id: folder.owner_id,
  created_by: userId,
})

// Notes - inherit notebook's owner_id
const notebook = await getNotebook(notebook_id)
await supabase.from('notes').insert({
  title,
  content,
  notebook_id,
  owner_id: notebook.owner_id,
  created_by: userId,
})
```

## Design System

Use only existing UI components from `/components/ui/`:

- Button, Card, Modal, Dropdown
- FormField, SearchInput, SelectField
- PageHeader, Breadcrumb, Skeleton
- LoadingButton, StatusMessage

## Testing Workflow

1. **Local Development**

   ```bash
   npm run dev
   # If cache issues: rm -rf .next
   ```

2. **Type Checking**

   ```bash
   npm run type-check
   ```

3. **Build & Deploy**
   ```bash
   npm run build  # Must pass
   git push       # Triggers Vercel
   ```

## Known Issues

1. **TypeScript errors** in admin console and some components
2. **Build failing** due to duplicate variable (see top)
3. **Performance** - Some queries could be optimized

## Important Patterns

### ViewStore Usage (Complex UI State)

```typescript
// ✅ GOOD - For complex editing
const foldersView = useFoldersView()
const { loadFolderView } = useViewActions()
```

### React Query Usage (Server State)

```typescript
// ✅ GOOD - For data fetching
const { data, isLoading } = useQuery({
  queryKey: ['folders'],
  queryFn: fetchFolders,
})
```

### Direct Supabase (Avoid)

```typescript
// ❌ BAD - Don't use in components
const { data } = await supabase.from('folders').select()
```

## File Structure

- `/app/` - Next.js app router pages and API routes
- `/components/` - React components
- `/lib/store/` - State management
- `/lib/query/` - React Query hooks
- `/lib/supabase/` - Database client and types
- `/supabase/migrations/` - Database schema

## Don't Trust Old Docs

Many markdown files in the repo are outdated. Always verify against:

1. Current code implementation
2. Database schema in migrations
3. TypeScript types in `database.types.ts`
