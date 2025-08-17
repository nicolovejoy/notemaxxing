# Supabase CLI Setup Guide

## Installation

```bash
# Install via Homebrew (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

## Project Setup

### 1. Get Your Project Reference

- Go to Supabase Dashboard → Settings → General
- Copy the "Reference ID" (looks like: `abcdefghijklmnopqrst`)

### 2. Link Your Project

```bash
# Navigate to project root
cd /Users/nico/src/notemaxxing

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# You'll be prompted to enter your database password
# This is the password you set when creating the project
```

### 3. Pull Current Schema

```bash
# Pull all current database schema into migration files
supabase db pull

# This creates timestamped migration files in supabase/migrations/
```

### 4. Generate TypeScript Types

```bash
# Generate types from your database schema
supabase gen types typescript --linked > lib/types/database.types.ts
```

## Daily Workflow

### Making Database Changes

```bash
# 1. Create a new migration file
supabase migration new your_change_description

# 2. Edit the file in supabase/migrations/
# 3. Apply to remote database
supabase db push

# 4. Regenerate types
supabase gen types typescript --linked > lib/types/database.types.ts
```

### Debugging Queries

```bash
# Run SQL directly
supabase db query "SELECT * FROM invitations LIMIT 5"

# Open interactive psql session
supabase psql

# Check migration status
supabase migration list
```

### After Dashboard Changes

```bash
# ALWAYS pull after making changes in dashboard
supabase db pull

# Commit the new migration files
git add supabase/migrations/
git commit -m "chore: pull dashboard schema changes"
```

## Current Issue to Fix

After setup, we need to fix the invitation preview 404 error:

```sql
-- The issue: Public/anon users can't read invitations table
-- Need to add RLS policy for public invitation preview

CREATE POLICY "Public can view invitation basics"
ON invitations FOR SELECT
TO anon, authenticated
USING (true);  -- Or more restrictive: USING (expires_at > NOW())
```

## Environment Variables

Create `.env.local` if not exists:

```bash
# Get these from Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Only if needed
```

## Troubleshooting

### "Cannot find project ref"

- Make sure you're in the project root directory
- Run `supabase link` again with correct project ref

### "Permission denied" errors

- Check RLS policies: `supabase db query "SELECT * FROM pg_policies WHERE tablename='your_table'"`
- Verify auth: `supabase db query "SELECT auth.uid()"`

### Type generation fails

- Ensure you're linked: `supabase projects list`
- Try with `--linked` flag: `supabase gen types typescript --linked`
