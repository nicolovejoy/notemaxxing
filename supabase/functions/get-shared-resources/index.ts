import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user auth from Authorization header
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Fetching shared resources for user:', user.id)

    // Get user's permissions
    const { data: permissions, error: permError } = await supabaseAdmin
      .from('permissions')
      .select('resource_id, resource_type, permission_level')
      .eq('user_id', user.id)
      .neq('permission_level', 'none')

    if (permError) {
      console.error('Error fetching permissions:', permError)
      return new Response(JSON.stringify({ error: 'Failed to fetch permissions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Found permissions:', permissions?.length || 0)

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

    console.log('Folder IDs to fetch:', folderIds)
    console.log('Notebook IDs to fetch:', notebookIds)

    // Fetch shared resources using service role (bypasses RLS)
    const results = await Promise.all([
      folderIds.length > 0
        ? supabaseAdmin.from('folders').select('*').in('id', folderIds)
        : Promise.resolve({ data: [], error: null }),
      notebookIds.length > 0
        ? supabaseAdmin.from('notebooks').select('*').in('id', notebookIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const [foldersResult, notebooksResult] = results

    if (foldersResult.error) {
      console.error('Error fetching folders:', foldersResult.error)
    }
    if (notebooksResult.error) {
      console.error('Error fetching notebooks:', notebooksResult.error)
    }

    // Add permission info to each resource
    const folders = (foldersResult.data || []).map((f) => ({
      ...f,
      shared: true,
      permission_level: permissions.find((p) => p.resource_id === f.id)?.permission_level || 'read',
    }))

    const notebooks = (notebooksResult.data || []).map((n) => ({
      ...n,
      sharedDirectly: true,
      permission_level: permissions.find((p) => p.resource_id === n.id)?.permission_level || 'read',
    }))

    console.log('Returning folders:', folders.length)
    console.log('Returning notebooks:', notebooks.length)

    return new Response(JSON.stringify({ folders, notebooks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
