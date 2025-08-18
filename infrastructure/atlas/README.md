# Atlas Database Infrastructure

This directory contains the database schema managed by Atlas and Terraform.

## Quick Setup

### 1. Create New Supabase Project

Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a new project:

- Project name: `notemaxxing-prod` (or similar)
- Database Password: Save this securely!
- Region: Choose closest to you

Wait for the project to finish provisioning (~2 minutes).

### 2. Get Database Connection String

In Supabase Dashboard:

1. Go to Settings → Database
2. Find "Connection String" section
3. Copy the URI (starts with `postgresql://`)
4. Replace `[YOUR-PASSWORD]` with your actual database password

### 3. Configure Terraform

```bash
cd infrastructure/atlas
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and add your connection string:

```hcl
database_url = "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
```

### 4. Initialize and Apply

```bash
# Initialize Terraform
terraform init

# Preview what will be created
terraform plan

# Apply the schema
terraform apply
```

Type `yes` when prompted. Atlas will:

1. Connect to your new database
2. Create all tables with correct columns
3. Create views (with correct `owner_id` field!)
4. Create indexes and foreign keys
5. Set up the complete schema

### 5. Update Application Config

Create/update `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-api-settings
```

Get these from Supabase Dashboard → Settings → API.

### 6. Test Locally

```bash
cd ../.. # Back to project root
npm run dev
```

The app should now work with the new database!

## Making Schema Changes

1. Edit `schema.hcl`
2. Run `terraform plan` to preview
3. Run `terraform apply` to apply

Atlas automatically generates the right SQL migrations.

## What's in the Schema?

### Tables

- `folders` - User folders with correct `owner_id`
- `notebooks` - Notebooks with `owner_id` and `created_by`
- `notes` - Notes with ownership tracking
- `permissions` - Sharing permissions
- `invitations` - Share invitations
- `quizzes` & `questions` - Quiz functionality

### Views

- `folders_with_stats` - Aggregated folder stats (WITH CORRECT `owner_id`!)
- `user_stats` - User statistics

### Key Features

- All ownership fields (`owner_id`) properly defined
- Foreign keys with CASCADE deletes
- Proper indexes for performance
- No database triggers (explicit field setting)

## Troubleshooting

### Connection Failed

- Check your database password is correct
- Ensure your IP is allowed (Supabase → Settings → Database → Connection Pooling)

### Schema Already Exists

If you get errors about existing objects, you may need to drop them first:

```sql
-- Run in Supabase SQL Editor
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

### State Issues

If Terraform gets confused:

```bash
terraform refresh  # Sync with actual database
terraform state list  # See what Terraform is tracking
```

## Next Steps

After successful setup:

1. Deploy to Vercel with new environment variables
2. Remove old migration files from `/supabase/migrations/`
3. Update CI/CD to use Terraform for schema changes
