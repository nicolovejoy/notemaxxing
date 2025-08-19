# Database Infrastructure

Clean, simple database management using Supabase migrations.

## Architecture Principles

- **RLS Disabled**: Security at API layer, not database
- **No Triggers/Functions**: All logic in API routes
- **No Database Functions**: Direct table operations only
- **Explicit Fields**: All fields set manually in code

## Current Setup

```
/supabase/migrations/         # Production schema (source of truth)
  *.sql.applied              # Applied migrations

/infrastructure/             # Utilities
  setup-database.sql        # Complete schema for new DBs
  apply-database.sh         # Simple psql apply script
  disable-rls.sql          # RLS disable utility
```

## Making Schema Changes

### 1. Create Migration

```bash
npx supabase migration new your_change_name
# Creates: supabase/migrations/[timestamp]_your_change_name.sql
```

### 2. Write Your Changes

```sql
-- Add table, column, index, etc
CREATE TABLE public_invitation_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  inviter_name TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
```

### 3. Apply to Database

```bash
npx supabase db push --db-url $DATABASE_URL
```

### 4. Mark as Applied

```bash
mv supabase/migrations/[timestamp]_your_change_name.sql \
   supabase/migrations/[timestamp]_your_change_name.sql.applied
```

## Database URLs

- **Production**: `dvuvhfjbjoemtoyfjjsg` (DB3-Atlas on Supabase)
- **Dev**: Create your own Supabase project

## Setting Up New Database

```bash
# Option 1: Use Supabase migrations (recommended)
npx supabase db push --db-url $NEW_DATABASE_URL

# Option 2: Use complete schema file
DATABASE_URL=$NEW_DATABASE_URL ./infrastructure/apply-database.sh
```

## Current Issue to Fix

Missing `public_invitation_previews` table. Run this SQL:

```sql
CREATE TABLE IF NOT EXISTS public_invitation_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  inviter_name TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_public_invitation_previews_token ON public_invitation_previews(token);
```

## Future Improvements

1. Automate the `.applied` renaming in CI/CD
2. Add migration rollback strategy
3. Generate TypeScript types automatically after migrations
