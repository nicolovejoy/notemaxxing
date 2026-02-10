-- Migration: Add folder_id to notes table
-- Purpose: Flatten permission checks so notes can be authorized via a single-table
--          lookup against permissions (folder_id → permissions.resource_id) instead of
--          joining through notebooks.

-- 1. Add the column (nullable initially so we can backfill)
ALTER TABLE public.notes ADD COLUMN folder_id uuid;

-- 2. Backfill from the parent notebook's folder_id
UPDATE public.notes
SET folder_id = notebooks.folder_id
FROM public.notebooks
WHERE notes.notebook_id = notebooks.id;

-- 3. Make it NOT NULL now that every row has a value
ALTER TABLE public.notes ALTER COLUMN folder_id SET NOT NULL;

-- 4. Add FK constraint
ALTER TABLE public.notes
  ADD CONSTRAINT fk_notes_folder
  FOREIGN KEY (folder_id) REFERENCES public.folders (id) ON DELETE CASCADE;

-- 5. Index for permission lookups
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON public.notes (folder_id);
