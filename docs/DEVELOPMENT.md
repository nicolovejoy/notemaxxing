# Development Guide

## Recent Updates (August 2025)

### Sharing System Implementation

- Implemented email-specific invitation system (not public links)
- Invitations expire after 7 days
- Self-invitations prevented at UI and API level
- Public preview endpoint for unauthenticated users shows minimal info
- Uses existing `has_permission()` function and RLS policies

### Known Issues

- **Folders Page Bug**: Regular users see blank folders page with loading skeletons
  - Root cause: `loadNotebooks(true)` in useEffect causing infinite loading
  - Homepage works fine (doesn't have this extra call)
  - Fix: Remove or fix the useEffect on folders page

## Quick Start

```bash
npm install
cp .env.local.example .env.local  # Add Supabase keys
npm run dev
```

## Commands

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - Code linting
- `npm run type-check` - TypeScript check

## Current Issues & Fixes

### Sharing System Blocked

The sharing UI is built but fails due to database constraints:

```sql
-- Problem: FK constraint to auth.users table
-- Fix: Run in Supabase SQL Editor
ALTER TABLE share_invitations DROP CONSTRAINT IF EXISTS share_invitations_invited_by_fkey;
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_granted_by_fkey;
```

### State Management Needs Refactor

- Zustand store should exist outside React
- Load all data (including shares) on login
- Make React components stateless

See TODO.md for priorities.

## Adding Features

1. **Update State**: Add to `/lib/store/useStore.ts`
2. **Add API**: Create route in `/app/api/`
3. **Update UI**: Build components in `/components/`
4. **Test**: Run lint and type-check

## Database Changes

1. Update `/scripts/complete-database-setup.sql`
2. Run in Supabase SQL Editor
3. Update TypeScript types
4. Test RLS policies

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=your-claude-key
```

## Deployment

- Automatic via Vercel on push to main
- Preview deployments for all branches
- Live at notemaxxing.net
