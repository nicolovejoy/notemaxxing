# Context for Claude

## Project Status (Updated: July 29, 2024)

- **Status**: Both critical errors fixed! ✅
- **React Hooks Error #185**: Fixed by moving auth to middleware
- **Infinite Loop Error**: Fixed by removing duplicate store initialization
- **Data Storage**: Hybrid - Zustand + Supabase (homepage, folders), localStorage (notebooks, quizzing)

## Tech Stack

- Next.js 15.4.4 with App Router
- React 19.1.0
- Zustand 5.0.6 with Immer middleware
- Supabase (auth + database with RLS)
- Tailwind CSS 4
- TypeScript 5.7.3
- Icons: Lucide React

## Current Architecture

### State Management

- **Zustand Store** (`/lib/store/`):
  - `useStore.ts` - Main store with optimistic updates
  - `hooks.ts` - React hooks for components
  - `supabase-helpers.ts` - API layer with null checks
  - `StoreProvider.tsx` - Wraps entire app (causing issues)

### Auth Flow

- **Middleware.ts** handles all auth (server-side)
- Protected routes: `/folders`, `/notebooks/*`, `/quizzing`, `/typemaxxing`
- Public routes: `/`, `/auth/login`, `/auth/signup`
- StoreProvider no longer does auth checks

### Pages Migration Status

- ✅ Homepage - Fully migrated to Zustand
- ✅ Folders page - Migrated but has double-init bug
- ❌ Notebooks page - Still uses localStorage
- ❌ Quizzing - Uses localStorage
- ❓ Typemaxxing - Unknown status

## Recent Fixes

### React Hooks Error #185 (Fixed)

- Moved all auth checks to middleware.ts
- Removed conditional logic from StoreProvider
- Store initializes unconditionally for authenticated users

### Infinite Loop Error (Fixed)

- Removed duplicate store initialization from folders page
- Store now only initializes once in StoreProvider
- No more "Maximum update depth exceeded" errors

### Data Model

- Hierarchical: Users → Folders → Notebooks → Notes
- Additional: Quizzes, Typemaxxing
- All tables have RLS enabled
- Using optimistic updates for better UX

## Development Guidelines

### When Fixing Issues

1. **Always run**: `npm run lint` and `npm run type-check`
2. **Test auth flow**: Logout → Login → Access protected routes
3. **Check console**: No infinite loops or hydration errors
4. **Verify data**: Folders/notebooks/notes load correctly

### Current Priorities

1. Fix infinite loop (remove duplicate init)
2. Complete localStorage → Zustand migration
3. Add proper SSR configuration
4. Improve error handling

### Known Issues

- Infinite render loop on protected pages
- 2 pages still use localStorage
- No loading skeletons
- Large components (450+ lines)
- Edge Runtime warnings from Supabase (harmless)

## Build & Deploy

- **Local Dev**: `npm run dev` (port 3000 or 3001)
- **Build**: `npm run build` (includes timestamp generation)
- **Deploy**: Automatic via Vercel
- **Live URL**: notemaxxing.net

## Important Notes

- **Experimental Phase**: No production data at risk
- **Test Data**: Feel free to create/delete anything
- **Pre-commit Hooks**: ESLint and Prettier run automatically
- **TypeScript Strict**: Some Supabase types use @ts-expect-error

## Next Session Focus

1. Apply infinite loop fix
2. Test thoroughly
3. Continue migration to Zustand
4. Consider route-based providers for better architecture
