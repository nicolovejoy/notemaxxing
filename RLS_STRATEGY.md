# Row Level Security (RLS) Strategy for Notemaxxing

## Current Issue

We're experiencing RLS policy violations when creating notebooks:

- Error: "new row violates row-level security policy for table 'notebooks'"
- This prevents users from creating new notebooks despite being authenticated

## Root Cause

The RLS policies are too restrictive for INSERT operations. The current policy requires `auth.uid() = user_id`, but during INSERT:

1. The `user_id` column hasn't been set yet (even with defaults)
2. Supabase evaluates the WITH CHECK clause before applying defaults
3. This creates a catch-22: can't insert because user_id doesn't match, but user_id can't be set until after insert

## Our RLS Strategy

### Core Principles

1. **User Isolation**: Users can only access their own data
2. **Automatic User Assignment**: `user_id` should be set automatically via `auth.uid()`
3. **Permissive Inserts**: Allow authenticated users to create new records
4. **Strict Read/Update/Delete**: Only allow operations on records the user owns

### Implementation Pattern

For each table (folders, notebooks, notes, quizzes):

```sql
-- 1. Set user_id to auto-populate
ALTER TABLE [table_name] ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. SELECT Policy - Users see only their data
CREATE POLICY "Users can view own [table_name]" ON [table_name]
    FOR SELECT USING (auth.uid() = user_id);

-- 3. INSERT Policy - Any authenticated user can insert
CREATE POLICY "Users can insert [table_name]" ON [table_name]
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. UPDATE Policy - Users can only update their own records
CREATE POLICY "Users can update own [table_name]" ON [table_name]
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. DELETE Policy - Users can only delete their own records
CREATE POLICY "Users can delete own [table_name]" ON [table_name]
    FOR DELETE USING (auth.uid() = user_id);
```

### Why This Works

1. **INSERT**: Checks only that user is authenticated (`auth.uid() IS NOT NULL`)
2. **User Assignment**: Database automatically sets `user_id = auth.uid()` via DEFAULT
3. **Other Operations**: Strict ownership check (`auth.uid() = user_id`)

## Current Status

### ✅ Fixed

- Folders table (users can create folders)

### ❌ Needs Fixing

- Notebooks table (INSERT policy too restrictive)
- Notes table (likely has same issue)
- Quizzes table (likely has same issue)

## Fix Deployment

1. **Immediate Fix** (for notebooks):

   ```bash
   # Run in Supabase SQL Editor:
   /lib/supabase/fix-notebooks-insert-policy.sql
   ```

2. **Complete Fix** (all tables):
   ```bash
   # Run in Supabase SQL Editor:
   /lib/supabase/fix-all-rls-policies.sql
   ```

## Testing RLS Policies

After applying fixes, test each operation:

1. **Create** - Can user create new records?
2. **Read** - Can user see only their records?
3. **Update** - Can user update only their records?
4. **Delete** - Can user delete only their records?
5. **Cross-user** - Ensure users cannot access other users' data

## Code Considerations

### DO NOT:

- Send `user_id` in API requests (let database handle it)
- Try to set `user_id` manually in the application
- Create policies that check `user_id` on INSERT

### DO:

- Rely on `auth.uid()` DEFAULT for user assignment
- Keep `user_id` out of insert payloads
- Test all CRUD operations after policy changes

## Monitoring

Watch for these errors:

- "new row violates row-level security policy" - INSERT policy too restrictive
- "permission denied for table" - RLS not enabled or no policies
- Empty results when data exists - SELECT policy too restrictive

## References

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- Our fix scripts: `/lib/supabase/fix-*.sql`
- Original schema: `/lib/supabase/schema.sql`
