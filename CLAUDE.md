# Context

## Design System

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - use existing UI components only.

## Rules

- Be succinct
- Dev server always running
- Ask before assuming
- Use local store when available
- No .md files unless asked
- SQL < 100 lines: show inline
- Ask before committing
- Run `npm run format` after changes

## Environment

```
SUPABASE_SERVICE_ROLE_KEY=required_for_admin
ADMIN_PASSWORD=required_for_admin
```

Admins: nicholas.lovejoy@gmail.com, mlovejoy@scu.edu

## Architecture

- **Local store**: User's folders/notebooks/notes
- **Remote only**: Invitations, permissions, other users
- **Sharing**: Email invites (7-day expiry), permission inheritance
- **RLS**: `has_permission()` function

## Known Issues

- No real-time sync
- Folder card icons overlap
