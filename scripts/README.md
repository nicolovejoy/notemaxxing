# Project Scripts

This directory contains scripts for database management, deployments, and utilities.

## Quick Start

Use the master script for common operations:

```bash
# Show all available commands
./scripts/run.sh help

# Deploy Edge Functions
./scripts/run.sh deploy-functions

# Revert RLS policies (if broken)
./scripts/run.sh revert-policies
```

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

## Script Organization

### SQL Scripts

- **`complete-database-setup.sql`** - Complete database schema (tables, RLS, functions)
- **`revert-broken-policies.sql`** - Emergency fix for RLS circular dependencies
- **`fix-shared-folders-policy.sql`** - ⚠️ BROKEN - Don't use (causes recursion)
- **`fix-sharing-properly.sql`** - ⚠️ BROKEN - Don't use (causes recursion)

### Shell Scripts

- **`run.sh`** - Master script for all operations
- **`deploy-edge-functions.sh`** - Deploy Supabase Edge Functions

### Utility Scripts

- **`generate-build-info.js`** - Generate build timestamp (runs during build)

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
