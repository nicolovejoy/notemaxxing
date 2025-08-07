# Context for Claude

## Important Instruction Reminders

- No superlatives
- Do what has been asked; nothing more
- Keep things simple. When there are multiple steps needed, describe the plan and get user feedback before beginning
- NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User
- Avoid positive affect or opinion. Do not say "great idea!" ever again.
- Be succinct
- Review plans and options with user frequently
- The user is always running the dev server - never attempt to start it
- **ASK QUESTIONS instead of making assumptions** - When requirements are unclear, ask specific questions rather than inventing features or behaviors
- **For SQL scripts** - If under 100 lines, show directly in console output instead of creating files
- **ALWAYS ask before committing** - Check with user before running git commit unless explicitly pre-authorized
- **USE LOCAL STATE WHEN AVAILABLE** - Always prefer data from the Zustand store (folders, notebooks, notes) over database queries when the data is already loaded locally

## Recent Session Accomplishments (Jan 2025)

### Admin Console Improvements

- Fixed data deletion using service role key with password protection
- UI now consistent with design system
- Added Max (mlovejoy@scu.edu) as co-developer admin
- Fixed modal flickering issue

### Environment Variables Required

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_PASSWORD=your_secure_password
```

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

**What's in Local State vs Database**:

- **In Local Store**: User's own folders, notebooks, notes (fully loaded on app start)
- **NOT in Local Store**: Invitations, permissions, other users' data, profiles
- **Pattern**: Always use local store data when available (e.g., folder/notebook names) instead of refetching from database

### Known Issues & Bugs

- Real-time sync not implemented - changes don't appear in other accounts without refresh
- Folder card UI has overlapping icons with title
- Accept invitation page shows "unnamed folder" instead of actual resource name
- Revoke access API route exists but Next.js returns 404 (may need cache clear)

### Notebook Management

- **Archive**: Available on regular notebooks (puts them in archived state)
- **Delete**: Only available on archived notebooks (permanent deletion)
- **Restore**: Available on archived notebooks (returns to regular state)
- To see archived notebooks: Toggle "Show archived" on folders page

### Key Components

- `/api/shares/*` - API routes for sharing operations
- `ShareButton`, `ShareDialog`, `SharedIndicator` - UI components
- Folders/notebooks have `shared` and `permission` properties when loaded
