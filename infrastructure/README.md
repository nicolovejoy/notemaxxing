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

## Database URLs

- **Production**: `dvuvhfjbjoemtoyfjjsg` (DB3-Atlas on Supabase)
- **Dev**: Create your own Supabase project

## User wants db-as-code with terraform, and believes this is mostly set up but this document was way out of date. Claude, please read the entire infrastructure directory and update this document with current state and best practices to preserve dv-as-code status.
