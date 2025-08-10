# Real-Time Sync Implementation Plan

**Note**: This is the detailed technical plan. See [IMPLEMENTATION_ROADMAP.md](./docs/IMPLEMENTATION_ROADMAP.md) for the incremental delivery approach.

## Summary

Zustand is **well-suited** for real-time sync. Current architecture is solid, needs targeted enhancements rather than rewrite.

## Current State

- ✅ Efficient Map-based store with indexes
- ✅ Optimistic updates with rollback
- ✅ Good separation (data vs UI stores)
- ✅ Basic real-time subscriptions (Phase 1 complete)
- ❌ No conflict resolution
- ❌ No offline queue
- ❌ Shared resources need Edge Functions

## Implementation Phases

### Phase 0: Edge Functions for Shared Resources (Immediate)

**Problem**: RLS policies block access to shared resources to prevent circular dependencies.

**Solution**: Supabase Edge Functions with service role access.

#### Implementation Steps:

1. **Create Edge Function** (`supabase/functions/get-shared-resources/index.ts`):

```typescript
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify user auth from Authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user's permissions
    const { data: permissions } = await supabaseAdmin
      .from('permissions')
      .select('resource_id, resource_type, permission')
      .eq('user_id', user.id)

    if (!permissions || permissions.length === 0) {
      return new Response(
        JSON.stringify({
          folders: [],
          notebooks: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Group permissions by type
    const folderIds = permissions
      .filter((p) => p.resource_type === 'folder')
      .map((p) => p.resource_id)

    const notebookIds = permissions
      .filter((p) => p.resource_type === 'notebook')
      .map((p) => p.resource_id)

    // Fetch shared resources (bypasses RLS with service role)
    const [foldersResult, notebooksResult] = await Promise.all([
      folderIds.length > 0
        ? supabaseAdmin.from('folders').select('*').in('id', folderIds)
        : { data: [] },
      notebookIds.length > 0
        ? supabaseAdmin.from('notebooks').select('*').in('id', notebookIds)
        : { data: [] },
    ])

    // Add permission info to each resource
    const folders = (foldersResult.data || []).map((f) => ({
      ...f,
      shared: true,
      permission: permissions.find((p) => p.resource_id === f.id)?.permission || 'read',
    }))

    const notebooks = (notebooksResult.data || []).map((n) => ({
      ...n,
      sharedDirectly: true,
      permission: permissions.find((p) => p.resource_id === n.id)?.permission || 'read',
    }))

    return new Response(JSON.stringify({ folders, notebooks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

2. **Update client-side code** (`lib/store/supabase-helpers.ts`):

```typescript
// Replace the existing shared folder fetching logic
async getAll(includeShared = true) {
  // Get own folders (unchanged)
  const { data: ownFolders } = await supabase
    .from('folders')
    .select('*')
    .order('created_at')

  if (!includeShared) return ownFolders

  // Get shared folders via Edge Function
  const { data: sharedData, error } = await supabase.functions.invoke(
    'get-shared-resources',
    {
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    }
  )

  if (error) {
    console.error('Failed to fetch shared resources:', error)
    return ownFolders
  }

  // Combine owned and shared folders
  return [...(ownFolders || []), ...(sharedData?.folders || [])]
}
```

3. **Deploy Edge Function**:

```bash
supabase functions deploy get-shared-resources
```

#### Benefits:

- **Immediate fix** for sharing without touching RLS
- **Clean separation** between owned and shared resource access
- **Extensible** for future features (audit logs, caching, etc.)
- **Secure** - service role only used server-side

### Phase 1: Basic Real-Time (✅ COMPLETE)

```typescript
// lib/store/realtime-manager.ts
class RealtimeManager {
  subscriptions: Map<string, RealtimeChannel>

  subscribeToUserData(userId: string) {
    // Subscribe to user's folders, notebooks, notes
    // Handle INSERT, UPDATE, DELETE events
    // Update store directly via dataManager
  }

  subscribeToSharedResources(userId: string) {
    // Subscribe to shared folders/notebooks
    // Handle permission changes
  }
}
```

### Phase 2: Conflict Resolution (1 day)

```sql
-- Add to each table
ALTER TABLE folders ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE notebooks ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE notes ADD COLUMN version INTEGER DEFAULT 1;

-- Auto-increment on update
CREATE TRIGGER increment_version_folders
BEFORE UPDATE ON folders
FOR EACH ROW SET NEW.version = OLD.version + 1;
```

Strategy: Last-write-wins with version check

- Optimistic update includes expected version
- Server rejects if version mismatch
- Client fetches latest and retries/merges

### Phase 3: Smart Subscriptions (1 day)

```typescript
// Subscribe only to what's needed
subscribeToFolder(folderId: string) {
  // When user opens folder
  supabase.channel(`folder:${folderId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notebooks',
      filter: `folder_id=eq.${folderId}`
    }, handleNotebookChange)
    .subscribe()
}

// Unsubscribe when navigating away
unsubscribeFromFolder(folderId: string) {
  supabase.removeChannel(`folder:${folderId}`)
}
```

### Phase 4: Offline Support (2 days)

```typescript
// lib/store/offline-queue.ts
interface QueuedOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'folder' | 'notebook' | 'note'
  data: any
  timestamp: number
  retries: number
}

class OfflineQueue {
  queue: QueuedOperation[] = []

  addOperation(op: QueuedOperation) {
    localStorage.setItem('offline_queue', JSON.stringify([...queue, op]))
  }

  processQueue() {
    // On reconnect, process in order
    // Handle conflicts with server state
  }
}
```

## Code Changes Required

### 1. DataManager Extensions

```typescript
// lib/store/data-manager.ts
class DataManager {
  private realtimeManager: RealtimeManager

  async initialize() {
    // ... existing code
    this.realtimeManager.subscribeToUserData(userId)
    this.realtimeManager.subscribeToSharedResources(userId)
  }

  handleRealtimeUpdate(entity: string, data: any, event: 'INSERT' | 'UPDATE' | 'DELETE') {
    // Check if update is from current client (skip if optimistic)
    // Apply update to store
    // Update indexes
    // Trigger UI updates
  }
}
```

### 2. Store Updates

```typescript
// lib/store/data-store.ts
interface DataState {
  // ... existing
  realtimeStatus: 'connected' | 'disconnected' | 'reconnecting'
  pendingOperations: number
  conflicts: ConflictRecord[]
}
```

### 3. UI Indicators

- Connection status badge
- Sync indicator per entity
- Conflict resolution dialog
- "Saving..." indicators

## Performance Considerations

### Selective Loading

```typescript
// Don't load all notes upfront
async loadNotebook(notebookId: string) {
  // Load notes only when notebook opened
  const notes = await notesApi.getByNotebook(notebookId)
  store.setNotes(notebookId, notes)

  // Subscribe to changes
  realtimeManager.subscribeToNotebook(notebookId)
}
```

### Batched Updates

```typescript
// Batch multiple real-time events
const pendingUpdates = new Map()
const flushUpdates = debounce(() => {
  store.batchUpdate(pendingUpdates)
  pendingUpdates.clear()
}, 100)
```

## Migration Strategy

1. **Deploy DB changes** (version columns, triggers)
2. **Feature flag** real-time for testing
3. **Gradual rollout** by user cohort
4. **Monitor** performance and conflicts
5. **Full release** after validation

## Estimated Timeline

- Phase 0 (Edge Functions): 0.5 days (Immediate fix for sharing)
- Phase 1 (Basic Real-Time): ✅ COMPLETE
- Phase 2 (Conflict Resolution): 1 day
- Phase 3 (Smart Subscriptions): 1 day
- Phase 4 (Offline Support): 2 days
- Testing & Polish: 2 days

**Total: ~7-9 days**

## Risks & Mitigations

| Risk                    | Mitigation                                    |
| ----------------------- | --------------------------------------------- |
| Performance degradation | Selective subscriptions, batching             |
| Complex conflicts       | Start with last-write-wins, evolve to merging |
| Network instability     | Offline queue, exponential backoff            |
| Data consistency        | Version tracking, server-side validation      |

## Success Metrics

- Real-time latency < 200ms
- Conflict rate < 1%
- Offline recovery success > 99%
- No increase in server costs
