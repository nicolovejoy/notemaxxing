# Notemaxxing Architecture

## Tech Stack

- **Frontend**: Next.js 15.4 (App Router), React 19, TypeScript 5.7
- **State**: Zustand 5.0 with Immer middleware
- **Database**: Supabase (PostgreSQL with RLS)
- **Styling**: Tailwind CSS 4
- **Rich Text**: TipTap 3.0 editor
- **AI**: Anthropic Claude for text enhancement

## State Management Strategy (Updated)

After evaluating the current scale (~50 notebooks, ~1000 notes) and single-developer scenario, we're taking a pragmatic approach rather than a full architectural rewrite.

### Current Issues (Actual vs Theoretical)

**Actual Problems:**

- Share metadata not loading upfront (causes dialog delays)
- Loading ALL notes on startup (slow initial load)
- No caching between sessions (full reload each time)

**Theoretical Problems (not critical at current scale):**

- Store inside React (Zustand handles this fine)
- Mixed concerns (manageable at 800 LOC)
- Array lookups (microseconds with 50 items)

### Implementation Plan: Selective Improvements

#### Phase 1: Share Metadata (Ship Immediately)

```typescript
// Add to existing store
sharePermissions: Map<string, Permission[]>
shareInvitations: ShareInvitation[]

// Load with initial data
await Promise.all([
  loadFolders(),
  loadNotebooks(),
  loadShareMetadata() // NEW - fixes dialog delays
])
```

#### Phase 2: Lazy Note Loading (Ship Next Week)

```typescript
// Track what's loaded
notesLoadedForNotebooks: Set<notebookId>

// Load on demand when notebook opened
loadNotesForNotebook: async (notebookId) => {
  if (already loaded) return
  const notes = await notesApi.getByNotebook(notebookId)
  // Add to existing notes array
}
```

#### Phase 3: Simple Caching (If Needed)

```typescript
// Only if users complain about reload times
saveToCache: () => localStorage.setItem('notemaxxing-cache', ...)
loadFromCache: () => { /* on startup */ }
```

### Why This Approach?

1. **Solves Real Problems**: Fixes actual user-facing issues
2. **Minimal Risk**: Small changes to working code
3. **Fast Delivery**: Each phase ships in days
4. **Appropriate Complexity**: Matches current app scale

### Full Architecture (For Reference)

We've already built the foundation for a full state management refactor in `/lib/store/`:

- Separated data/UI stores
- Map-based storage
- External state manager

This remains available if the app grows to need it (1000s of notebooks, multiple developers).

## Database Schema

### Core Tables

- `profiles` - User profiles
- `folders` - User's folders
- `notebooks` - Notebooks in folders
- `notes` - Notes in notebooks
- `quizzes` - Quiz data

### Sharing Tables (Currently Blocked)

- `share_invitations` - Pending share invites
- `permissions` - Active share permissions

**Issue**: Foreign key to `auth.users` causes permission errors. Needs removal.

## File Structure

```
app/               # Pages & routes
  api/            # API routes
  auth/           # Authentication
  folders/        # Folder management
  notebooks/[id]/ # Notebook view
  share/[id]/     # Share acceptance

components/        # UI components
lib/
  store/          # Zustand state
  supabase/       # DB client
  api/            # API helpers
```

## Security

- Row Level Security (RLS) on all tables
- Middleware-based auth protection
- User can only access own data (except shares)
