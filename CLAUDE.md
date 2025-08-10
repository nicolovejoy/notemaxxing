# Context

## Current Focus: Real-Time Sync Implementation

### Week 1 Plan

- **Days 1-2**: Basic real-time (subscribe, handle events)
- **Days 3-4**: Conflict resolution (versioning, optimistic updates)
- **Day 5**: Smart subscriptions (only active resources)

### Week 2 Plan

- **Days 6-7**: Offline support (queue & sync)
- **Days 8-9**: Polish, testing, UI indicators

See [IMPLEMENTATION_ROADMAP.md](./docs/IMPLEMENTATION_ROADMAP.md) for details.

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
