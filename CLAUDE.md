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
4. **Universal Search & Navigation**:
   - Single search bar that searches everything (folders, notebooks, notes)
   - Context-aware search filtering
   - Clickable folder titles navigate to most recent notebook
   - Individual folder cards on homepage are clickable
   - Notebook-only sorting with persistent preferences
5. **Bug Fixes**:
   - Fixed auto-generated note titles to strip HTML/RTF formatting
   - Fixed TypeScript errors in typing API route

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

## Component Design Patterns

When creating UI components, follow these established patterns:

### Core UI Components

- **PageHeader**: Consistent header with navigation and user menu
- **SearchInput**: Unified search bars with icon and focus states
- **Dropdown**: Reusable dropdown menus with options and icons
- **EmptyState**: Consistent "no items" messages with optional actions
- **InlineEdit**: Edit-in-place pattern with save/cancel buttons
- **Modal**: Existing modal component for dialogs
- **Skeleton**: Loading states (to be consolidated)

### Card Components

- **EntityCard**: Flexible card for folders/notebooks headers
- **NoteCard**: Specialized card for note display with actions
- **NotebookCard**: Notebook display with archive/edit capabilities
- **AddNoteCard**: Dashed border card for creating new items

### Component Guidelines

1. Extract common patterns into reusable components
2. Keep components focused on single responsibilities
3. Use TypeScript interfaces for all props
4. Include hover states and transitions
5. Support keyboard navigation where appropriate
6. Use consistent spacing and styling tokens

# important-instruction-reminders

No superlatives
Do what has been asked; nothing more.
Keep things simple. when there are multiple steps needed, describe the plan and get user feedback.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
Avoid positive affect or opinion.
be succinct.
review plans and options with user frequently.
