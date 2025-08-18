-- Database Views for Notemaxxing
-- These are managed separately from Atlas since views require paid tier

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.folders_with_stats CASCADE;
DROP VIEW IF EXISTS public.user_stats CASCADE;

-- Create folders_with_stats view
-- CRITICAL: Uses owner_id (not user_id) to match the rest of the schema
CREATE VIEW public.folders_with_stats AS
SELECT 
  f.id,
  f.owner_id,  -- Correct column name
  f.name,
  f.color,
  f.created_at,
  f.updated_at,
  COUNT(DISTINCT n.id) FILTER (WHERE n.archived = false) as notebook_count,
  COUNT(DISTINCT n.id) FILTER (WHERE n.archived = true) as archived_count,
  COUNT(DISTINCT nt.id) as note_count,
  MAX(GREATEST(f.updated_at, n.updated_at, nt.updated_at)) as last_activity
FROM public.folders f
LEFT JOIN public.notebooks n ON n.folder_id = f.id
LEFT JOIN public.notes nt ON nt.notebook_id = n.id
GROUP BY f.id, f.owner_id, f.name, f.color, f.created_at, f.updated_at;

-- Create user_stats view
CREATE VIEW public.user_stats AS
SELECT 
  f.owner_id as user_id,
  COUNT(DISTINCT f.id) as total_folders,
  COUNT(DISTINCT n.id) as total_notebooks,
  COUNT(DISTINCT nt.id) as total_notes,
  COUNT(DISTINCT n.id) FILTER (WHERE n.archived = true) as total_archived
FROM public.folders f
LEFT JOIN public.notebooks n ON n.folder_id = f.id
LEFT JOIN public.notes nt ON nt.notebook_id = n.id
GROUP BY f.owner_id;

-- Grant appropriate permissions (adjust based on your Supabase anon/authenticated roles)
GRANT SELECT ON public.folders_with_stats TO anon, authenticated;
GRANT SELECT ON public.user_stats TO anon, authenticated;