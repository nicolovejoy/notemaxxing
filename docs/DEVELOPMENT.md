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

✅ **Working Features:**

- User auth & data persistence
- Folders, notebooks, notes CRUD
- Quizzing & typemaxxing
- Admin console with user management (press 'd' 3x)
- User deletion from admin console

⚠️ **Known Issues:**

- Seed data trigger breaks auth (currently disabled)
- New users must be seeded manually via admin console
- Admin auth is client-side only (security risk)

## Next Priorities

1. **Fix Seed Data**: Re-implement without breaking auth
2. **Security**: Move admin auth server-side
3. **UX**: Add loading skeletons
4. **Features**: Search functionality

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

## AI Integration (Simplified MVP)

### Tech Stack

```bash
npm install @tiptap/react @tiptap/starter-kit openai
```

### Implementation Steps

1. **Rich Text Editor**
   - Replace textarea with TipTap
   - Add formatting toolbar (bold, italic, lists, headings)
   - Auto-save on blur

2. **AI Enhancement**

   ```typescript
   // Simple API route at /api/ai/enhance
   const response = await openai.chat.completions.create({
     model: 'gpt-3.5-turbo',
     messages: [
       { role: 'system', content: 'Improve grammar and clarity...' },
       { role: 'user', content: noteContent },
     ],
   })
   ```

3. **Rate Limiting**
   - Simple in-memory counter: 50 requests/day per user
   - Upgrade to Redis later if needed

4. **UI Integration**
   - Single "Enhance with AI ✨" button
   - Loading state while processing
   - Toast notifications for errors

### Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
ENABLE_AI=true
```

## Deployment

Automatic via Vercel on push to main branch.
Live at: [notemaxxing.net](https://notemaxxing.net)
