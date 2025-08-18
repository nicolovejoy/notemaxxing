# Atlas + Terraform: Database-as-Code Migration Plan

## Executive Summary

Move from broken Supabase migrations to Atlas + Terraform for true infrastructure-as-code. Since all data is test data, we can start fresh with a properly managed database.

## Current Problems

1. **Supabase migrations broken** - `.applied` files not tracking properly
2. **No state tracking** - Can't tell what's deployed vs in code  
3. **Manual SQL** - Writing migrations by hand is error-prone
4. **No rollback** - Can't easily undo changes
5. **Production is broken** - `folders_with_stats` has wrong column name

## Solution: Atlas + Terraform

### What is Atlas?
- **Declarative schema management** - Define desired state, not migrations
- **Automatic migration generation** - Atlas figures out the SQL
- **HCL-based** - Same language as Terraform
- **Drift detection** - Knows when production differs from code

### Implementation Steps

#### 1. Install Tools (5 min)
```bash
brew install terraform
brew install ariga/tap/atlas
```

#### 2. Create New Supabase Project (10 min)
- Go to Supabase dashboard
- Create new project (e.g., "notemaxxing-prod")
- Get connection string
- Update `.env.local` with new credentials

#### 3. Define Schema (already done in code)
Create `schema.hcl` with entire database structure:
- All tables (folders, notebooks, notes, permissions)
- All views (folders_with_stats with correct `owner_id`)
- All indexes and foreign keys
- All functions

#### 4. Configure Terraform (5 min)
```hcl
# main.tf
resource "atlas_schema" "notemaxxing" {
  hcl = file("schema.hcl")
  url = var.database_url
}
```

#### 5. Apply Schema (5 min)
```bash
terraform init
terraform plan   # Preview SQL that will run
terraform apply  # Create entire database
```

#### 6. Update Application (5 min)
- Change Supabase URL and anon key in `.env.local`
- Deploy to Vercel with new environment variables

## Benefits

### Immediate
- **Fix production** - Correct `folders_with_stats` view from day one
- **Clean start** - No migration history baggage
- **Version controlled** - All changes in Git

### Long-term
- **Predictable deployments** - Always know what will happen
- **Team collaboration** - Review schema changes in PRs
- **Rollback capability** - Terraform can undo changes
- **CI/CD ready** - Automate with GitHub Actions

## Schema Management Going Forward

### Making Changes
1. Edit `schema.hcl`
2. Run `terraform plan` to see SQL
3. Review changes
4. Run `terraform apply`

### Example: Add a Column
```hcl
table "folders" {
  column "description" {
    type = text
    null = true
  }
  # ... rest of table
}
```
Atlas automatically generates: `ALTER TABLE folders ADD COLUMN description TEXT`

## Migration Timeline

### Day 1 (Today)
1. ✅ Install Atlas and Terraform
2. ✅ Create schema.hcl file
3. ⬜ Create new Supabase project
4. ⬜ Apply schema with Terraform
5. ⬜ Test application locally
6. ⬜ Deploy to Vercel

### Day 2
1. ⬜ Set up GitHub Actions for auto-deploy
2. ⬜ Document schema change process
3. ⬜ Remove old migration files

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| New tool learning curve | Low | Atlas uses HCL like Terraform |
| Data loss | None | It's all test data |
| Deployment issues | Low | Can always revert to old project |
| Team adoption | Low | Much simpler than current system |

## Atlas Pricing Issue

**UPDATE**: Atlas requires paid account ($9/user/month) for views. Since `folders_with_stats` view is critical, options:
1. Pay for Atlas Pro ($9/month)
2. Use Terraform with raw SQL for views (free)
3. Manual SQL management for views only

## Decision

**Proceed with Atlas + Terraform** because:

1. **Current system is broken** - Supabase migrations aren't working
2. **No real users** - Perfect time to start fresh
3. **Industry standard** - Terraform is widely adopted
4. **Declarative is better** - Define end state, not steps
5. **Solves all our problems** - State tracking, rollback, automation

## Next Action

1. Create new Supabase project
2. Run the Terraform + Atlas setup
3. Test the application
4. Switch production to new database

Total time: ~30 minutes to have a properly managed database.