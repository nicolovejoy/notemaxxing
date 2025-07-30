# Context for Claude

## Project Status (Updated: July 30, 2025)

- **Status**: Fully functional with all core features working! ✅
- **React Hooks Error #185**: Fixed by moving auth to middleware
- **Infinite Loop Error**: Fixed by removing duplicate store initialization
- **Data Storage**: Fully migrated to Zustand + Supabase (all pages)
- **RLS Policies**: Fixed - all CRUD operations working

## Tech Stack

- Next.js 15.4.4 with App Router
- React 19.1.0
- Zustand 5.0.6 with Immer middleware
- Supabase (auth + database with RLS)
- Tailwind CSS 4
- TypeScript 5.7.3
- Icons: Lucide React + Custom Logo

## Current Architecture

### State Management

- **Zustand Store** (`/lib/store/`):
  - `useStore.ts` - Main store with optimistic updates
  - `hooks.ts` - React hooks for components
  - `supabase-helpers.ts` - API layer with error handling
  - `StoreProvider.tsx` - Wraps entire app

### Auth Flow

- **Middleware.ts** handles all auth (server-side)
- Protected routes: `/folders`, `/notebooks/*`, `/quizzing`, `/typemaxxing`
- Public routes: `/`, `/auth/login`, `/auth/signup`
- StoreProvider initializes store for authenticated users

### Pages Migration Status

- ✅ Homepage - Fully migrated to Zustand
- ✅ Folders page - Fully migrated, all bugs fixed
- ✅ Notebooks page - Migrated from localStorage to Zustand
- ✅ Quizzing - Migrated from localStorage to Zustand
- ✅ Typemaxxing - Standalone page (no data storage needed)

## Recent Accomplishments

### All Critical Issues Resolved ✅

1. **React Hooks Error #185**: Moved auth to middleware
2. **Infinite Loop Error**: Fixed store initialization
3. **RLS Policy Violations**: Fixed INSERT policies for all tables
4. **localStorage Migration**: Completed for all pages
5. **Seed Data**: Created auto-seeding for new users
6. **Logo Branding**: Added custom logo throughout app

### Working Features

- ✅ Create/edit/delete folders with colors
- ✅ Create/edit/archive/restore notebooks
- ✅ Create/edit/delete notes with auto-save
- ✅ Create quizzes with questions
- ✅ User authentication with Supabase
- ✅ Data persistence in cloud
- ✅ Optimistic updates for instant UI feedback
- ✅ Archive/restore functionality
- ✅ Custom logo and favicon

### Data Model

- Hierarchical: Users → Folders → Notebooks → Notes
- Additional: Quizzes, Typemaxxing
- All tables have RLS enabled with proper policies
- Using optimistic updates for better UX

## Development Guidelines

### When Fixing Issues

1. **Always run**: `npm run lint` and `npm run type-check`
2. **Test auth flow**: Logout → Login → Access protected routes
3. **Check console**: No errors or warnings
4. **Verify data**: All CRUD operations work correctly

### RLS Policy Pattern

For INSERT operations, use: `WITH CHECK (auth.uid() IS NOT NULL)`
For SELECT/UPDATE/DELETE: `USING (auth.uid() = user_id)`

## Build & Deploy

- **Local Dev**: `npm run dev` (port 3000 or 3001)
- **Build**: `npm run build` (includes timestamp generation)
- **Deploy**: Automatic via Vercel
- **Live URL**: notemaxxing.net

## Important Notes

- **Production Ready**: All core features working
- **Pre-commit Hooks**: ESLint and Prettier run automatically
- **TypeScript Strict**: Full type safety
- **Seed Data**: New users get starter content automatically

## Next Priorities

1. Add loading skeletons for better UX
2. Implement search functionality
3. Add export features (PDF, Markdown)
4. Consider real-time sync between devices
5. Add offline support with IndexedDB

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
