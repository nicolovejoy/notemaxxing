# Database Migration Plan

## Goal

Move from console-managed database to code-managed schema (infrastructure-as-code)

## Steps

1. **Create Complete Schema** ✅ COMPLETED
   - Single migration file with all tables, RLS, functions
   - Fixes ownership model (owner_id = owner, created_by = creator)
   - Located at: `supabase/migrations/20250101000000_complete_schema.sql`

2. **New Supabase Project** ✅ COMPLETED
   - Created fresh project: `vtaloqvkvakylrgpqcml`
   - No legacy data or schema issues

3. **Deploy & Test** ✅ COMPLETED
   - Linked new project with `supabase link`
   - Deployed schema directly via SQL editor
   - Updated `.env.local` with new credentials
   - Testing features locally

4. **Update Vercel** 🔄 IN PROGRESS
   - Need to update environment variables
   - Deploy preview branch
   - Verify everything works

5. **Cutover** ⏳ PENDING
   - Merge to main after fixing share acceptance
   - Old database remains as backup

## Benefits

- Version controlled schema
- Clean slate (no migration conflicts)
- Proper ownership model from start
- Easy rollback capability

## Timeline

- Today: Create schema and new project
- Test locally
- Deploy to preview
- Merge when stable
