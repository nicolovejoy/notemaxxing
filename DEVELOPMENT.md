# Notemaxxing Development Guide

## Quick Start

```bash
# Install
npm install

# Environment
cp .env.local.example .env.local
# Add Supabase keys

# Run
npm run dev
```

## Commands

- `npm run dev` - Start development
- `npm run build` - Production build
- `npm run lint` - Check code style
- `npm run type-check` - TypeScript validation

## Current Status

✅ **All features working:**

- User auth & data persistence
- Folders, notebooks, notes CRUD
- Quizzing & typemaxxing
- Admin console (press 'd' 3x)

## Next Priorities

1. **Security**: Move admin auth server-side
2. **UX**: Add loading skeletons
3. **Features**: Search functionality
4. **Polish**: Auto-refresh admin console

## Development Tips

### Adding Features

1. Update Zustand store in `/lib/store/useStore.ts`
2. Add Supabase helpers in `supabase-helpers.ts`
3. Create UI components with TypeScript
4. Test with `npm run lint && npm run type-check`

### Database Changes

1. Update `/lib/supabase/schema.sql`
2. Run migration in Supabase dashboard
3. Update TypeScript types
4. Test RLS policies

### Common Issues

- **RLS errors**: Check INSERT policies use `auth.uid() IS NOT NULL`
- **Type errors**: Run `npm run type-check`
- **Build fails**: Check `npm run lint` first

## Deployment

Automatic via Vercel on push to main branch.
Live at: [notemaxxing.net](https://notemaxxing.net)
