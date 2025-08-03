# Context for Claude

## Important Instruction Reminders

- No superlatives
- Do what has been asked; nothing more
- Keep things simple. When there are multiple steps needed, describe the plan and get user feedback
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User
- Avoid positive affect or opinion
- Be succinct
- Review plans and options with user frequently
- The user is always running the dev server - never attempt to start it

## Current Architecture

### Sharing System

- Database already has `permissions` and `share_invitations` tables
- Existing `has_permission(resource_type, resource_id, user_id, permission)` function handles access control
- RLS policies use this function - no need to recreate policies
- Sharing works for both folders and notebooks with permission inheritance

### Key Components

- `/api/shares/*` - API routes for sharing operations
- `ShareButton`, `ShareDialog`, `SharedIndicator` - UI components
- Folders/notebooks have `shared` and `permission` properties when loaded
