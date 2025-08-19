# Notemaxxing Handoff Document

_Date: August 19, 2024_

## Current State ✅

### What's Working

- **Core Features**: Folders, notebooks, notes, AI enhancement
- **Admin Console**: View users, permissions, stats, health (placeholder)
- **Sharing**: Invitation creation works, acceptance needs table fix
- **Database**: Production running on `dvuvhfjbjoemtoyfjjsg`
- **Deployment**: Live on Vercel

### Today's Achievements

1. ✅ Fixed sharing invitation creation (removed RPC, direct inserts)
2. ✅ Added fully functional admin console
3. ✅ Simplified infrastructure (removed Atlas complexity, kept Terraform)
4. ✅ Fixed architecture violations (API routes for notebooks/permissions)

## Immediate Action Required 🚨

### 1. Add Missing Database Table

Update `/infrastructure/setup-database.sql` and apply via Terraform:

```bash
cd infrastructure/terraform
terraform apply
```

The table has been added to the setup script.

### 2. ✅ Architecture Violations Fixed

Both direct Supabase calls have been replaced with API routes:

- `/app/folders/[id]/page.tsx` - Now uses `POST /api/notebooks`
- `/components/ShareDialog.tsx` - Now uses `PATCH /api/permissions/[id]`

## Environment Setup 🔧

### Required Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://dvuvhfjbjoemtoyfjjsg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]
ADMIN_PASSWORD=[choose-password]

# For migrations
DATABASE_URL=postgresql://postgres:[password]@db.dvuvhfjbjoemtoyfjjsg.supabase.co:5432/postgres
```

### Admin Access

Hardcoded in API routes:

- `nicholas.lovejoy@gmail.com`
- `mlovejoy@scu.edu`

To change: Update `ADMIN_EMAILS` in `/app/api/admin/*/route.ts`

## Architecture Rules 📐

### Core Principles

1. **No RLS** - Security at API layer
2. **No database functions** - Logic in API routes
3. **No triggers** - Explicit field setting
4. **No direct Supabase in components** - Use API routes

### Data Flow

```
Component → API Route → Supabase → Database
     ↑          ↓
   React Query Cache
```

### When to Use What

- **ViewStore**: Complex UI state (notebook editor)
- **React Query**: All data fetching
- **API Routes**: All database operations
- **Direct Supabase**: NEVER in components

## Known Issues 🐛

### Must Fix

1. Missing `public_invitation_previews` table (run Terraform to apply)
2. ✅ Direct Supabase calls fixed

### Should Fix

3. TypeScript errors in some components
4. "Shared by me" indicator inconsistent
5. Can't move notebooks between folders yet

### Nice to Have

6. Bulk operations in admin console
7. Real health monitoring
8. Automated tests

## Development Workflow 💻

### Local Development

```bash
npm install
npm run dev  # Port 3001 if 3000 is busy
```

### Making Schema Changes

```bash
# 1. Update the setup-database.sql file with your changes

# 2. Apply via Terraform
cd infrastructure/terraform
terraform apply

# Note: Migration files in /supabase/migrations are kept for history
# but Terraform manages the actual schema from setup-database.sql
```

### Deployment

```bash
npm run build  # Must pass
git push       # Auto-deploys to Vercel
```

## Project Structure 📁

```
/app/api/           # API routes (all DB operations here)
/components/        # React components
/lib/store/         # State management
/lib/supabase/      # DB client and types
/supabase/migrations/ # Schema history (for reference)
/infrastructure/    # Database infrastructure
  setup-database.sql # Complete schema (source of truth)
  terraform/        # Terraform configuration for applying schema
```

## Testing Checklist ✓

### Sharing Flow

1. [ ] Create folder
2. [ ] Share folder (generates invitation)
3. [ ] Preview invitation at `/share/[token]`
4. [ ] Accept invitation (different user)
5. [ ] See shared folder in "Shared with me"
6. [ ] Edit if write permission

### Admin Console

1. [ ] Access from user menu (admin only)
2. [ ] View all users with stats
3. [ ] View all permissions
4. [ ] Reset user data (with password)
5. [ ] View system stats

## Contact & Resources 📞

### Documentation

- `/CLAUDE.md` - Core guidelines
- `/infrastructure/README.md` - Database management (needs update for Terraform)
- `/infrastructure/terraform/` - Terraform setup for database
- `/DESIGN_SYSTEM.md` - UI components

### Help

- Create issue at: github.com/[your-repo]/issues
- Supabase dashboard: app.supabase.com
- Vercel dashboard: vercel.com/dashboard

## Next Sprint Priorities 🎯

1. **Fix violations** - Create missing API routes
2. **Test sharing** - Full end-to-end flow
3. **Move notebooks** - Implement folder-to-folder moves
4. **Add tests** - At least for critical paths
5. **Performance** - Optimize slow queries

---

_Good luck! The foundation is solid, just needs some polish. -Claude_
