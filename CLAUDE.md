# Context for Claude

## Status: Production Ready ✅

Notemaxxing is a note-taking app with folders, notebooks, notes, quizzing, and typing practice.
Live at: [notemaxxing.net](https://notemaxxing.net)

## Recent Work Completed

1. **Admin Console**: Added user management with delete functionality
2. **Seed Data**: New users get starter content (via admin console for now - need to fix eventually)

## Known Issues

- Seed data trigger breaks auth (disabled for now)
- Need to re-implement seed data without affecting signup flow
- Admin auth is client-side only (security concern)
- typing and quizz features not yet developed.

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

1. **AI Integration**: Add rich text editor with AI enhancement
   - TipTap for basic formatting (bold, italic, lists, headings)
   - Single "Enhance with AI" button for grammar/clarity
   - Simple OpenAI integration with 50 req/day limit
   - Auto-save on blur
2. **Seed Data**: Re-implement without breaking auth
3. **Security**: Move admin auth to server-side
4. **UX**: Add loading skeletons

## Quick Tips

- Admin console: for Max and Nico, the creators
- Seed new users via admin console "Add Seed Data" button
- Check `/ARCHITECTURE.md` and `/DEVELOPMENT.md` for details

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
Keep things simple. when there are multiple steps needed, describe the plan and get user feedback.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
Avoid positive affect or opinion.
be succinct.
review plans and options with user frequently.
