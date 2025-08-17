# Schema Management

## Migration Files

- Location: `supabase/migrations/`
- Format: `YYYYMMDD_description.sql`

## Key Commands

```bash
# Pull schema from remote
npx supabase db pull

# Push migrations to remote
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --local > lib/types/database.types.ts
```

## Fixing Migration Sync Issues

When you get "migration history does not match" errors:

```bash
# Check remote migration history
npx supabase db remote query "SELECT * FROM supabase_migrations.schema_migrations"

# Repair specific migration
npx supabase migration repair --status applied 20250816

# Or repair with full name
npx supabase migration repair --status applied 20250816_fix_permissions_infinite_recursion
```

## Recent Migrations

- `20250814_permission_system.sql` - Base tables
- `20250816_public_private_invitations.sql` - Hybrid invitation system
- `20250816_fix_permissions_infinite_recursion.sql` - Fixed RLS circular dependency
