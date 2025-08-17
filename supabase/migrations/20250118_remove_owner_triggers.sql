-- Remove automatic owner setting triggers
-- We'll explicitly set owner_id and created_by in application code for better type safety

-- Drop triggers
DROP TRIGGER IF EXISTS set_notebook_owner_on_insert ON notebooks;
DROP TRIGGER IF EXISTS set_note_owner_on_insert ON notes;

-- Drop functions
DROP FUNCTION IF EXISTS set_notebook_owner();
DROP FUNCTION IF EXISTS set_note_owner();

-- Add comment explaining the change
COMMENT ON COLUMN notebooks.owner_id IS 'Must be explicitly set to folder owner_id when creating notebook';
COMMENT ON COLUMN notebooks.created_by IS 'Must be explicitly set to auth.uid() when creating notebook';
COMMENT ON COLUMN notes.owner_id IS 'Must be explicitly set to notebook owner_id when creating note';
COMMENT ON COLUMN notes.created_by IS 'Must be explicitly set to auth.uid() when creating note';