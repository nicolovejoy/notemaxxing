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
- **ALWAYS ask before committing** - Check with user before running git commit unless explicitly pre-authorized

## Current Architecture

### Sharing System

- Database has `permissions` and `share_invitations` tables
- `has_permission(resource_type, resource_id, user_id, permission)` function handles access control
- RLS policies use this function for access control
- Sharing works for both folders and notebooks with permission inheritance
- Email-specific invitations (not public links) with 7-day expiry
- Invitation preview endpoint for unauthenticated users shows minimal info
- Self-invitations prevented at both UI and API level
- Read-only permissions properly reflected in UI (no edit/delete buttons shown)

### Store Architecture

We use a clean Zustand store system:

- **Data Store**: `/lib/store/data-store.ts` - Manages all app data (folders, notebooks, notes)
- **UI Store**: `/lib/store/ui-store.ts` - Manages UI state (selections, preferences)
- **Data Manager**: `/lib/store/data-manager.ts` - Handles all API operations

**Key Features**:

- All data loaded at app initialization for instant access
- Full-text search works across all content
- Optimistic updates for better UX
- Clean hook API that returns raw data (no wrapper objects)

### Known Issues & Bugs

- Need to refresh after accepting share invitation to see shared resources
- Need to refresh after login to see folders
- Real-time sync not implemented - changes don't appear in other accounts without refresh
- Folder card UI has overlapping icons with title
- Accept invitation page shows "unnamed folder" instead of actual resource name

### Notebook Management

- **Archive**: Available on regular notebooks (puts them in archived state)
- **Delete**: Only available on archived notebooks (permanent deletion)
- **Restore**: Available on archived notebooks (returns to regular state)
- To see archived notebooks: Toggle "Show archived" on folders page

### Key Components

- `/api/shares/*` - API routes for sharing operations
- `ShareButton`, `ShareDialog`, `SharedIndicator` - UI components
- Folders/notebooks have `shared` and `permission` properties when loaded
