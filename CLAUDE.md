# Context for Claude

## Status: Production Ready ✅

Notemaxxing is a note-taking app with folders, notebooks, notes, quizzing, and typing practice.
Live at: [notemaxxing.net](https://notemaxxing.net)

## Recent Work Completed

1. **AI Enhancement**:
   - Switched from OpenAI to Claude 3.5 Sonnet
   - Text selection enhancement with preview modal
   - Undo functionality for AI changes
   - Preserve HTML formatting during enhancement
2. **Typemaxxing Feature**:
   - Complete MVP with note-based typing practice
   - AI generates practice text from selected notes
   - Multi-step flow: notebook → notes → config → type → results
3. **UI Improvements**:
   - Clickable folder names in notebook sidebar
   - Modular components (Modal, ColorPicker, EntityCard)
   - Loading skeletons throughout

## Known Issues

- Seed data trigger breaks auth (disabled for now)
- Need to re-implement seed data without affecting signup flow
- Admin auth is client-side only (security concern)
- Quiz feature not yet developed

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

1. **Quiz Feature**: Implement quiz functionality similar to typemaxxing
2. **Study Topics**: Add persistence for note selections (reusable across features)
3. **Code Refactoring**: Continue extracting reusable components
4. **Seed Data**: Re-implement without breaking auth
5. **Security**: Move admin auth to server-side

## Quick Tips

- Admin console: for Max and Nico, the creators
- Seed new users via admin console "Add Seed Data" button
- Check `/ARCHITECTURE.md` and `/DEVELOPMENT.md` for details

# important-instruction-reminders

No superlatives
Do what has been asked; nothing more.
Keep things simple. when there are multiple steps needed, describe the plan and get user feedback.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
Avoid positive affect or opinion.
be succinct.
review plans and options with user frequently.
