# Context for Claude

## Status: Production Ready ✅

Notemaxxing is a note-taking app with folders, notebooks, notes, quizzing, and typing practice.
Live at: [notemaxxing.net](https://notemaxxing.net)

## Recent Work Completed

1. **Admin Console**: Added user management with delete functionality
2. **Seed Data**: New users get starter content (via admin console for now)
3. **Bug Fixes**: Fixed auto-save error when opening notes
4. **Documentation**: Consolidated from 9 to 5 markdown files

## Known Issues

- Seed data trigger breaks auth (disabled for now)
- Need to re-implement seed data without affecting signup flow
- Admin auth is client-side only (security concern)

## Key Info

- **Stack**: Next.js 15.4, React 19, Zustand, Supabase, TypeScript
- **Auth**: Middleware-based, protected routes
- **State**: Zustand with optimistic updates
- **Database**: Supabase with RLS policies

## Commands

```bash
npm run dev         # Start development
npm run lint        # Check code style
npm run type-check  # Validate types
npm run build       # Production build
```

## Current Priorities

1. **Seed Data**: Re-implement without breaking auth
2. **Security**: Move admin auth to server-side
3. **UX**: Add loading skeletons
4. **Features**: Search functionality

## Quick Tips

- Admin console: Press 'd' 3 times
- Seed new users via admin console "Add Seed Data" button
- RLS pattern: INSERT uses `auth.uid() IS NOT NULL`
- Check `/ARCHITECTURE.md` and `/DEVELOPMENT.md` for details

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
