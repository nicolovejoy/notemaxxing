# Context

## Current Status

### Completed ✅

- **Phase 0**: Edge Functions for shared resources (deployed & working)
- **Phase 1 (Partial)**: Basic real-time infrastructure (WebSocket connections established)
- **UI**: Connection status indicator showing real-time status

### In Progress 🚧

- **Phase 1 (Fix)**: Real-time sync not triggering UI updates
- **Bug**: Invitation acceptance flow needs fixing

### Next Steps 📋

- **Phase 2**: Conflict resolution (versioning, optimistic updates)
- **Phase 3**: Smart subscriptions (only active resources)
- **Phase 4**: Offline support (queue & sync)

See [REALTIME_SYNC_PLAN.md](./REALTIME_SYNC_PLAN.md) for technical details.

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

- Real-time sync doesn't trigger UI updates (WebSocket connected but changes don't reflect)
- Invitation acceptance flow broken (permissions not created on accept)
- Share link copying/pasting doesn't work properly
- Folder card icons overlap
