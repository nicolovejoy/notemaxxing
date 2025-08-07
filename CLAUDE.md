# Context for Claude

## CRITICAL: Design System

**MUST READ FIRST**: See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for all UI components.

- **NEVER** create new form inputs, buttons, modals, or UI components
- **ALWAYS** use existing components from `/components/ui/`
- Run `npm run format` after making changes

## Rules

- Be succinct, no superlatives
- Do only what's asked
- User always has dev server running
- Ask questions instead of assuming
- Use local Zustand store data when available
- Never create .md files unless asked
- SQL < 100 lines: show in console, don't create files
- Ask before committing

## Environment Variables

```
SUPABASE_SERVICE_ROLE_KEY=required_for_admin
ADMIN_PASSWORD=required_for_admin
```

## Admins

- nicholas.lovejoy@gmail.com
- mlovejoy@scu.edu

## Architecture

### Store

- **Local**: User's folders, notebooks, notes (loaded on start)
- **Not local**: Invitations, permissions, other users' data
- **Pattern**: Use local store when available

### Sharing

- Email-based invitations (7-day expiry)
- Permission inheritance from folders to notebooks
- `has_permission()` database function for RLS

### Known Issues

- No real-time sync
- Folder card icons overlap

## Component Checklist

When building UI, use these components:

- `FormField` - ALL text inputs
- `SelectField` - ALL dropdowns
- `LoadingButton` - ALL async buttons
- `StatusMessage` - ALL error/success messages
- `Modal` + `ModalFooter` - ALL dialogs
- `Card` - Content containers
- `IconButton` - Icon-only buttons
- See DESIGN_SYSTEM.md for complete list
