# Database Infrastructure

This directory contains database schema management for Notemaxxing.

## Structure

- `atlas/schema.hcl` - Declarative database schema (tables, indexes, foreign keys)
- `atlas/views.sql` - Database views (managed separately due to Atlas pricing)
- `terraform/` - Terraform configuration for applying schema
- `apply-schema.sh` - One-command deployment script

## Prerequisites

```bash
# Install required tools
brew install terraform
brew install ariga/tap/atlas
brew install postgresql  # for psql client
```

## Setup New Database

### 1. Create New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create new project
3. Copy the database URL from Settings → Database
4. Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### 2. Apply Schema

```bash
# Set database URL and run
export DATABASE_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres"
./infrastructure/apply-schema.sh
```

This will:

1. Create all tables with Atlas (free tier)
2. Apply views with raw SQL
3. Set up all indexes and foreign keys

### 3. Update Application

```bash
# Update .env.local with new credentials
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

## Making Schema Changes

### Tables/Indexes/Foreign Keys

1. Edit `atlas/schema.hcl`
2. Run `./apply-schema.sh` to apply changes

### Views

1. Edit `atlas/views.sql`
2. Run `./apply-schema.sh` to apply changes

## Why This Approach?

- **Atlas Free Tier**: Manages tables, indexes, and foreign keys declaratively
- **Raw SQL for Views**: Avoids $9/month Atlas Pro requirement
- **Version Controlled**: All changes tracked in Git
- **Rollback Capable**: Terraform state allows reverting changes
- **CI/CD Ready**: Can be automated with GitHub Actions

## Troubleshooting

### Connection Issues

- Check your DATABASE_URL format
- Ensure your IP is whitelisted in Supabase (Settings → Database → Connection Pooling)

### Migration Conflicts

- Atlas tracks state, so it knows what's already applied
- To force reset: `terraform destroy` then `terraform apply`

### View Errors

- Views depend on tables existing first
- The script ensures tables are created before views
