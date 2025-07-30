# Context for Claude

## Status: Production Ready ✅

Notemaxxing is a note-taking app with folders, notebooks, notes, quizzing, and typing practice.
Live at: [notemaxxing.net](https://notemaxxing.net)

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

1. **Security**: Move admin auth to server-side (currently client-side)
2. **UX**: Add loading skeletons
3. **Features**: Search functionality
4. **Polish**: Auto-refresh admin console

## Quick Tips

- Admin console: Press 'd' 3 times
- RLS pattern: INSERT uses `auth.uid() IS NOT NULL`
- All data flows through `/lib/store/supabase-helpers.ts`
- Check `/ARCHITECTURE.md` and `/DEVELOPMENT.md` for details

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
