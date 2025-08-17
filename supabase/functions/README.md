# Supabase Edge Functions

This directory contains Edge Functions that run on Supabase's infrastructure with elevated permissions to handle operations that regular RLS policies cannot.

## Functions

### `get-shared-resources`

**Purpose**: Fetches folders and notebooks that have been shared with a user. This function uses the service role key to bypass RLS policies, which is necessary because RLS policies would create circular dependencies when checking the permissions table.

**Why it's needed**:

- RLS policies only allow users to see their OWN resources (`auth.uid() = user_id`)
- Shared resources are owned by other users
- Checking permissions in RLS creates circular dependencies
- Edge Functions with service role can safely bypass RLS

**How it works**:

1. Authenticates the user from the Authorization header
2. Queries the permissions table for resources shared with the user
3. Fetches the actual folders/notebooks using service role (bypasses RLS)
4. Returns the combined data with permission levels

**Usage**:

```typescript
const { data } = await supabase.functions.invoke('get-shared-resources', {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
})
// Returns: { folders: [...], notebooks: [...] }
```

## Development

### Prerequisites

- Supabase CLI: `brew install supabase/tap/supabase`
- Access to the Supabase project

### Testing Locally

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve get-shared-resources

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/get-shared-resources' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json'
```

### Deployment

```bash
# Run the deployment script
./scripts/deploy-edge-functions.sh

# Or manually:
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy get-shared-resources
```

### Monitoring

```bash
# View function logs
supabase functions logs get-shared-resources

# View recent invocations
supabase functions list
```

## Environment Variables

The Edge Functions have access to these environment variables:

- `SUPABASE_URL`: The Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for bypassing RLS
- `SUPABASE_ANON_KEY`: Anonymous key (not used here)

## Security Considerations

1. **Authentication Required**: The function always validates the user's JWT token
2. **Service Role**: Only used server-side, never exposed to client
3. **Permissions Check**: Only returns resources the user has explicit permissions for
4. **CORS**: Configured to allow requests from any origin (adjust if needed)

## Troubleshooting

### Function returns 401 Unauthorized

- Check that the Authorization header is being sent
- Verify the token is valid and not expired
- Check function logs for auth errors

### Function returns empty results

- Verify permissions exist in the database
- Check that resources haven't been deleted
- Look at function logs for query errors

### Function not found (404)

- Ensure the function is deployed: `supabase functions list`
- Check the function name matches exactly
- Redeploy if necessary

### CORS errors

- The function includes CORS headers for all origins
- If still getting errors, check browser console for details
- May need to adjust `corsHeaders` in `_shared/cors.ts`
