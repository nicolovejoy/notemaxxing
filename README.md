# Notemaxxing

A collaborative note-taking application with folders, notebooks, and real-time sharing.

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Editor**: TipTap (rich text editing)
- **Deployment**: Vercel

## Database Setup

### Current Status

- **Project**: `vtaloqvkvakylrgpqcml` (new, code-managed schema)
- **Schema**: Single migration file at `/supabase/migrations/20250101000000_complete_schema.sql`
- **Architecture**: Infrastructure-as-code (no console modifications)

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://vtaloqvkvakylrgpqcml.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

3. Install dependencies:

```bash
npm install
```

4. Run development server:

```bash
npm run dev
```

## Features

### Core Functionality

- ✅ Folders, notebooks, and notes hierarchy
- ✅ Rich text editing with AI enhancement
- ✅ Folder and notebook sharing with permissions (read/write)
- ✅ User authentication with Supabase Auth

### Sharing System

- **Folder sharing**: Grants access to all notebooks and notes within
- **Notebook sharing**: Independent notebook-level permissions
- **Permission levels**: `read` (view only) or `write` (can edit)
- **Invitation flow**: Email-based invitations with 7-day expiry

### Data Model

- **Ownership**: Resources have `owner_id` (who owns) and `created_by` (who created)
- **Permissions**: Stored in `permissions` table with user, resource, and level
- **Invitations**: Token-based system with public preview for unauthenticated users

## Architecture Patterns

### ViewStore Pattern

Each page loads only its required data - no global state loading:

```typescript
const foldersView = useFoldersView() // ✅ Only current view
// NOT: const notes = useNotes() // ❌ Loads everything
```

### Database Queries

- Server-side aggregation for counts
- Pagination built into view APIs
- RLS policies enforce access control

## Known Issues

- Real-time sync needs reconnection to new database
- User emails show as IDs in sharing UI (need database function for auth.users access)
- Minor UI glitches in note viewing/editing

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run format       # Format code with Prettier
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

## Deployment

### Vercel

1. Update environment variables in Vercel dashboard
2. Deploy from main branch
3. Automatic deployments on push

## Contributing

1. Follow existing code patterns (check neighboring files)
2. Use ViewStore pattern for data loading
3. Run `npm run format` before committing
4. Keep components in existing design system

## License

Private project
