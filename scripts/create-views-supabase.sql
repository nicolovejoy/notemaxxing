-- Database Views for Notemaxxing (Supabase Compatible)
-- Run this in the Supabase SQL Editor

-- 1. Folders with aggregated stats
CREATE OR REPLACE VIEW public.folders_with_stats AS
SELECT 
  f.id,
  f.name,
  f.color,
  f.user_id,
  f.created_at,
  f.updated_at,
  COUNT(DISTINCT CASE WHEN n.archived = false THEN n.id END) as notebook_count,
  COUNT(DISTINCT CASE WHEN n.archived = true THEN n.id END) as archived_count,
  COUNT(DISTINCT nt.id) as note_count,
  GREATEST(
    f.updated_at,
    MAX(n.updated_at),
    MAX(nt.updated_at)
  ) as last_activity
FROM public.folders f
LEFT JOIN public.notebooks n ON n.folder_id = f.id
LEFT JOIN public.notes nt ON nt.notebook_id = n.id
GROUP BY f.id, f.name, f.color, f.user_id, f.created_at, f.updated_at;

-- 2. Notebooks with note counts
CREATE OR REPLACE VIEW public.notebooks_with_stats AS
SELECT 
  n.id,
  n.name,
  n.color,
  n.folder_id,
  n.user_id,
  n.archived,
  n.archived_at,
  n.created_at,
  n.updated_at,
  COUNT(DISTINCT nt.id) as note_count,
  MAX(nt.updated_at) as last_note_date
FROM public.notebooks n
LEFT JOIN public.notes nt ON nt.notebook_id = n.id
GROUP BY n.id, n.name, n.color, n.folder_id, n.user_id, 
         n.archived, n.archived_at, n.created_at, n.updated_at;

-- 3. User stats summary (for dashboard)
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
  f.user_id,
  COUNT(DISTINCT f.id) as total_folders,
  COUNT(DISTINCT n.id) as total_notebooks,
  COUNT(DISTINCT nt.id) as total_notes,
  COUNT(DISTINCT CASE WHEN n.archived = true THEN n.id END) as total_archived
FROM public.folders f
LEFT JOIN public.notebooks n ON n.folder_id = f.id
LEFT JOIN public.notes nt ON nt.notebook_id = n.id
GROUP BY f.user_id;

-- 4. Shared resources view (combines folders and notebooks)
CREATE OR REPLACE VIEW public.shared_resources_with_details AS
SELECT 
  p.id as permission_id,
  p.user_id,
  p.resource_id,
  p.resource_type,
  p.permission,
  p.created_at as shared_at,
  CASE 
    WHEN p.resource_type = 'folder' THEN f.name
    WHEN p.resource_type = 'notebook' THEN n.name
  END as resource_name,
  CASE 
    WHEN p.resource_type = 'folder' THEN f.color
    WHEN p.resource_type = 'notebook' THEN n.color
  END as resource_color,
  CASE 
    WHEN p.resource_type = 'folder' THEN f.user_id
    WHEN p.resource_type = 'notebook' THEN n.user_id
  END as owner_id,
  n.folder_id as notebook_folder_id
FROM public.permissions p
LEFT JOIN public.folders f ON p.resource_type = 'folder' AND p.resource_id = f.id
LEFT JOIN public.notebooks n ON p.resource_type = 'notebook' AND p.resource_id = n.id;

-- Grant permissions (Supabase handles this differently)
-- These views will inherit RLS from the underlying tables

-- Create RLS policies for the views
-- Note: Views in Supabase inherit RLS from their base tables automatically
-- But we can add explicit policies if needed

-- Test that the views work
-- You can run these queries after creating the views:
-- SELECT * FROM folders_with_stats WHERE user_id = auth.uid() LIMIT 5;
-- SELECT * FROM notebooks_with_stats WHERE user_id = auth.uid() LIMIT 5;
-- SELECT * FROM user_stats WHERE user_id = auth.uid();