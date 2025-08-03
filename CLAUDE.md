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
- **ASK QUESTIONS instead of making assumptions** - When requirements are unclear, ask specific questions rather than inventing features or behaviors
- **For SQL scripts** - If under 100 lines, show directly in console output instead of creating files

## Current Architecture

### Sharing System

- Database already has `permissions` and `share_invitations` tables
- Existing `has_permission(resource_type, resource_id, user_id, permission)` function handles access control
- RLS policies use this function - no need to recreate policies
- Sharing works for both folders and notebooks with permission inheritance
- Email-specific invitations (not public links) with 7-day expiry
- Invitation preview endpoint for unauthenticated users shows minimal info
- Self-invitations prevented at both UI and API level

### Known Issues

#### Folders Page for Regular Users

- **BUG**: Regular users see blank folders page with loading skeletons
- **NOT an RLS issue** - homepage successfully shows the same folders
- User has folder "Unfolding, slowly" visible on homepage but not folders page
- RLS policies are working correctly (folders load on homepage)
- Issue is specific to folders page implementation:
  - Folders page has useEffect calling `loadNotebooks(true)` (line 61)
  - This doesn't exist on homepage
  - Might be creating infinite loading loop keeping `notebooksLoading` true
  - Loading state: `const loading = foldersLoading || notebooksLoading`
- **Root cause**: Extra `loadNotebooks(true)` call in useEffect on folders page

### Key Components

- `/api/shares/*` - API routes for sharing operations
- `ShareButton`, `ShareDialog`, `SharedIndicator` - UI components
- Folders/notebooks have `shared` and `permission` properties when loaded
