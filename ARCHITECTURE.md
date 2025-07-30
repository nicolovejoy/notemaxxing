# Notemaxxing Architecture

## Tech Stack

- **Frontend**: Next.js 15.4 (App Router), React 19, TypeScript 5.7
- **State**: Zustand 5.0 with Immer middleware
- **Database**: Supabase (PostgreSQL with RLS)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React + Custom Logo

## Data Model

```
Users → Folders → Notebooks → Notes
Users → Quizzes
```

### Database Schema

All tables have:

- `user_id` (auto-set to `auth.uid()`)
- Row Level Security (RLS) policies
- Automatic timestamps

See `/lib/supabase/schema.sql` for details.

## Architecture Patterns

### State Management

- Zustand store with optimistic updates
- All API calls through `supabase-helpers.ts`
- Error handling with toast notifications
- TypeScript interfaces in `/lib/types/`

### Authentication

- Middleware-based auth (`middleware.ts`)
- Protected routes: `/folders`, `/notebooks/*`, `/quizzing`
- Public routes: `/`, `/auth/*`

### RLS Strategy

```sql
-- INSERT: Any authenticated user
WITH CHECK (auth.uid() IS NOT NULL)

-- SELECT/UPDATE/DELETE: Own data only
USING (auth.uid() = user_id)
```

## Admin System

**Current**: Client-side email check (dev only)
**TODO**: Server-side RBAC with audit logs

See admin console with 'd' key 3x.

## File Structure

```
app/           # Pages & routes
components/    # Shared UI components
lib/
  store/      # Zustand state management
  supabase/   # DB client & SQL files
  types/      # TypeScript definitions
```
