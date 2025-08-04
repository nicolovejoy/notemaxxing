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

### State Architecture (Migration Complete!)

The new Zustand state architecture is now fully deployed:

- **Data Store**: Separated data/UI stores with Maps for O(1) lookups
- **Data Manager**: External state manager with optimistic updates
- **Full Data Loading**: All data (folders, notebooks, notes) loaded at initialization
- **Instant Search**: Full-text search works across all content immediately

**Architecture Benefits:**

- No loading delays when navigating
- Instant search across everything
- Clean separation of concerns
- Ready for real-time sync when needed

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
