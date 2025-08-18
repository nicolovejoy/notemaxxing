-- Fix folders_with_stats view to use owner_id instead of user_id
DROP VIEW IF EXISTS folders_with_stats CASCADE;

CREATE VIEW folders_with_stats AS
SELECT 
  f.id,
  f.owner_id,  -- Changed from user_id to owner_id
  f.name,
  f.color,
  f.created_at,
  f.updated_at,
  COUNT(DISTINCT n.id) FILTER (WHERE n.archived = false) as notebook_count,
  COUNT(DISTINCT n.id) FILTER (WHERE n.archived = true) as archived_count,
  COUNT(DISTINCT nt.id) as note_count,
  MAX(GREATEST(f.updated_at, n.updated_at, nt.updated_at)) as last_activity
FROM folders f
LEFT JOIN notebooks n ON n.folder_id = f.id
LEFT JOIN notes nt ON nt.notebook_id = n.id
GROUP BY f.id, f.owner_id, f.name, f.color, f.created_at, f.updated_at;