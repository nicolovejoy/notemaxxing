# Context for Claude

## Project Status

- **Experimental Phase**: This is a raw experiment/prototype
- **No Critical Data**: All data is test data - no production users or critical information
- **Data Storage**: Currently using localStorage, migrating to Supabase
- **Feel Free to Experiment**: Since there's no critical data, we can make bold changes

## Tech Stack

- Next.js 15.4.4 with App Router
- React 19.1.0
- Zustand 5.0.6 (installed but not yet implemented)
- Supabase (auth configured, schema ready)
- Tailwind CSS
- TypeScript

## Current Architecture

- localStorage for data persistence (see `lib/storage.ts`)
- Planning to migrate to Zustand + Supabase
- Hierarchical data model: Users → Folders → Notebooks → Notes
- Additional features: Quizzes, Typemaxxing

## Development Notes

- Always run lint checks: `npm run lint`
- Build includes timestamp generation: `npm run build`
- Test data can be reset/deleted without concern
- Optimistic UI updates are preferred for better UX
