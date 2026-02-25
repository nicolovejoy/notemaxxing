# Claude Guidelines - Notemaxxing

## Critical Rules

### Database

- **NO triggers/functions** - Set all fields explicitly
- **Terraform managed** - Use `/infrastructure/terraform/` for schema changes
- RLS prepared but not applied (see `SECURITY_MIGRATION.md`)
- **Pending migration**: `infrastructure/migrations/002_add_folder_id_to_notes.sql` must run before deploy

### Data Flow

```
Component → API Route → Supabase → Database
```

- **NEVER** use Supabase directly in components
- Exception: `usePermissionSync` for realtime subscriptions (read-only)

### Ownership Model

- `owner_id` required on all resources
- Notebooks inherit folder's `owner_id`
- Notes inherit notebook's `owner_id` and `folder_id`

### Sharing Model

- **FOLDER-ONLY** - Cannot share notebooks or notes directly
- Contents inherit folder permissions
- Levels: `read` (view) or `write` (edit)
- Email invitations with 7-day expiry

## Coding Standards

1. Plan approach with user before coding
2. TypeScript - proper types, avoid `any`
3. Run `npm run format` after changes
4. Must pass `npm run build` before pushing

## Current State

- **Build**: Passing
- **AI Model**: `claude-sonnet-4-20250514`
- **Sharing**: Working

## Planned Features

- **Quizzmaxxing** - Quiz-based learning (multiple choice, fill-in-blank)
- **Typemaxxing** - Typing-based learning (type from memory, WPM tracking)
- Separate features, both use AI to generate questions from notes
