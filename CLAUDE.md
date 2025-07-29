# Context for Claude

## Project Status

- **Experimental Phase**: This is a raw experiment/prototype
- **No Critical Data**: All data is test data - no production users or critical information
- **Data Storage**: Hybrid approach - Zustand + Supabase (folders page migrated), localStorage (other pages)
- **Feel Free to Experiment**: Since there's no critical data, we can make bold changes

## Tech Stack

- Next.js 15.4.4 with App Router
- React 19.1.0
- Zustand 5.0.6 with Immer middleware (✅ implemented for folders)
- Supabase (auth working, database connected)
- Tailwind CSS 4
- TypeScript 5.7.3
- Icons: Lucide React (removed @radix-ui/react-icons)

## Current Architecture

### State Management (NEW!)

- **Zustand Store** (`/lib/store/`):
  - `useStore.ts` - Main store with optimistic updates
  - `hooks.ts` - React hooks for components
  - `supabase-helpers.ts` - API layer
  - `StoreProvider.tsx` - Auth-aware provider

### Pages Migration Status

- ✅ Folders page - Fully migrated to Zustand + Supabase
- ❌ Homepage - Still uses localStorage
- ❌ Notebooks page - Still uses localStorage
- ❌ Quizzing - Uses localStorage
- ❌ Typemaxxing - Uses localStorage

### Data Model

- Hierarchical: Users → Folders → Notebooks → Notes
- Additional features: Quizzes, Typemaxxing
- All tables have RLS (Row Level Security) enabled

## Development Notes

- **Pre-commit hooks active**: ESLint and Prettier run automatically
- Always run lint checks: `npm run lint`
- TypeScript checks: `npm run type-check`
- Build includes timestamp generation: `npm run build`
- Test data can be reset/deleted without concern
- Optimistic UI updates implemented in Zustand store

## Known Issues

- Edge Runtime warnings from Supabase (harmless, ignore)
- Two pages still import from `/lib/storage.ts` (homepage, notebooks)

## Next Steps

1. Migrate homepage to use Zustand store
2. Migrate notebooks page to use Zustand store
3. Add real-time subscriptions
4. Implement offline queue with IndexedDB
