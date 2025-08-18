# Notemaxxing Project Documentation

## 🚀 Current State (August 17, 2025)

### Build Status: PASSING ✅

- Migration to explicit owner_id completed
- All TypeScript errors resolved
- Ready for production deployment

## Architecture Overview

### Core Principles

1. **API-First**: All data operations through API routes (no direct Supabase in components)
2. **Type-Safe**: Full TypeScript with generated database types
3. **Permission-Based**: Folder-first sharing model with inheritance
4. **Real-time**: Supabase subscriptions for live updates

### Tech Stack

- **Framework**: Next.js 15.4.4 (App Router)
- **Database**: Supabase PostgreSQL
- **State Management**:
  - React Query for server state
  - Zustand for complex UI state (editor only)
- **UI**: Custom component library + Tailwind CSS
- **Auth**: Supabase Auth with RLS

## Database Schema

### Ownership Model

```typescript
// Every resource has an owner
folders:    { owner_id, created_by, ... }
notebooks:  { owner_id, created_by, folder_id, ... }  // inherits folder's owner_id
notes:      { owner_id, created_by, notebook_id, ... } // inherits notebook's owner_id
```

**IMPORTANT**: No database triggers - all fields must be set explicitly in code

### Sharing Model

- **Folder-First**: Share folders, notebooks inherit permissions
- **Permissions**: `read`, `write`, `admin`
- **Move-to-Control**: Moving notebooks changes access
- **Owner-Only Moves**: Only owners can move resources

## Development Guidelines

### Data Fetching Pattern

```typescript
// ✅ CORRECT - Use React Query with API routes
const { data, isLoading } = useQuery({
  queryKey: ['folders'],
  queryFn: () => fetch('/api/views/folders').then((r) => r.json()),
})

// ❌ WRONG - Direct Supabase in components
const { data } = await supabase.from('folders').select()
```

### State Management Rules

1. **Server State**: Always use React Query
2. **UI State**: Use component state or Zustand for complex editors
3. **View Store**: Only for pre-aggregated view data
4. **No Direct DB**: Never call Supabase from components

### Creating Resources

```typescript
// API routes handle ownership inheritance
POST /api/folders
  → owner_id = current user

POST /api/notebooks
  → owner_id = folder.owner_id
  → created_by = current user

POST /api/notes
  → owner_id = notebook.owner_id
  → created_by = current user
```

## Project Structure

```
/app/                   # Next.js app router
  /api/                 # API routes (all data operations)
  /(pages)/             # Page components
/components/            # React components
  /ui/                  # Design system components
  /cards/               # Card components
/lib/                   # Core libraries
  /store/               # Zustand stores
  /query/               # React Query hooks
  /supabase/            # DB client and types
/supabase/migrations/   # Database schema
```

## API Architecture

### View APIs (Aggregated Data)

- `/api/views/folders` - Folders with stats
- `/api/views/notebooks/[id]/notes` - Notebook with notes
- `/api/views/folders/[id]/notebooks` - Folder notebooks

### Resource APIs (CRUD)

- `/api/folders` - Folder operations
- `/api/notebooks` - Notebook operations
- `/api/notes` - Note operations

### Permission APIs

- `/api/shares/invite` - Send invitations
- `/api/shares/accept` - Accept invitations
- `/api/shares/revoke` - Revoke access
- `/api/permissions/resource-permissions` - Get permissions

## Known Issues & TODOs

### High Priority

1. **Direct Supabase Calls**:
   - ShareDialog.tsx:318 - needs API route
   - Admin console - disabled, needs rewrite

2. **Performance**:
   - Large notebooks slow to load
   - Consider pagination for notes

### Medium Priority

1. Add comprehensive tests
2. Implement audit logging
3. Add offline support

### Low Priority

1. Clean up ESLint warnings
2. Optimize bundle size
3. Add more keyboard shortcuts

## Environment Setup

### Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://vtaloqvkvakylrgpqcml.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
```

### Local Development

```bash
npm install
npm run dev     # Start dev server
npm run build   # Build for production
npm run format  # Format code
```

### Database Migrations

```bash
npx supabase db push  # Apply migrations
# Migrations auto-rename to .applied after running
```

## Deployment

### Vercel (Production)

```bash
git push origin main  # Auto-deploys via GitHub integration
```

### Pre-deployment Checklist

1. Run `npm run build` locally
2. Run `npm run type-check`
3. Test core flows (create, edit, share)
4. Check error handling

## Security Considerations

1. **RLS Enabled**: All tables have Row Level Security
2. **API Validation**: All inputs validated at API layer
3. **Permission Checks**: Double-checked (client + server)
4. **No Direct DB Access**: Components can't query database
5. **Audit Trail**: All modifications tracked with created_by

## Contributing Guidelines

1. **Follow Patterns**: Use existing code as reference
2. **Type Everything**: No `any` types without good reason
3. **Test First**: Write tests for new features
4. **Small PRs**: Keep changes focused and reviewable
5. **Document Changes**: Update this file for architecture changes

---

Last Updated: August 17, 2025
Migration Status: Complete
Build Status: Passing
