# Database Scripts

This directory contains SQL scripts for managing the Notemaxxing database.

## Complete Setup

### 1. Fresh Database Setup

Use this when starting from scratch or resetting everything:

```bash
# Run these scripts in order:
1. reset-database.sql          # Clears all data
2. complete-database-setup.sql # Creates all tables, functions, policies
3. setup-admin.sql            # Grants admin role (after signup)
```

### 2. Development Workflow

When making database changes:

1. Edit `complete-database-setup.sql` with your changes
2. Reset and recreate:
   ```sql
   -- In Supabase SQL Editor
   -- First run reset-database.sql
   -- Then run complete-database-setup.sql
   ```
3. Test your changes
4. Commit the updated setup script

## Individual Scripts

- **`reset-database.sql`** - Removes all data and users
- **`complete-database-setup.sql`** - Creates entire database schema
- **`setup-admin.sql`** - Grants admin role to specific email
- **`fix-user-creation.sql`** - Fixes trigger conflicts (now included in complete setup)
- **`create-profiles-table.sql`** - Creates just the profiles table (now included in complete setup)

## Adding New Features

When adding a new feature that requires database changes:

1. Add the table definition to section 2 (CREATE TABLES)
2. Add indexes to section 3 (CREATE INDEXES)
3. Enable RLS in section 4
4. Add any functions to section 5
5. Add triggers to section 6
6. Add RLS policies to section 7

## Migration Strategy

For production, create incremental migration files:

```sql
-- migrations/005_your_feature.sql
-- Add only the changes needed for your feature
```

But keep `complete-database-setup.sql` updated as the source of truth for fresh installs.
