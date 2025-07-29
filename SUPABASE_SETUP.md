# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New project"
3. Choose your organization (create one if needed)
4. Project settings:
   - Name: `notemaxxing`
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to your users
   - Pricing Plan: Free tier

## 2. Run Database Schema

1. In Supabase Dashboard, go to SQL Editor
2. Click "New query"
3. Copy contents of `/lib/supabase/schema.sql`
4. Paste and click "Run"

## 3. Get API Keys

1. Go to Settings → API
2. Copy these values to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon/public key

## 4. Enable Email Auth

1. Go to Authentication → Providers
2. Enable Email provider
3. Configure email settings:
   - Enable email confirmations: OFF (for now, to test faster)
   - Minimum password length: 6

## 5. Generate TypeScript Types

After creating tables, run:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
```

## Next Steps

Once setup is complete:
1. Test auth with a simple signup/login
2. Start migrating localStorage data to Supabase
3. Add real-time sync features