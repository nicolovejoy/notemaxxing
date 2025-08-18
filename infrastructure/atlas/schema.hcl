schema "public" {
  comment = "Notemaxxing database schema"
}

// Tables

table "folders" {
  schema = schema.public
  
  column "id" {
    type = uuid
    default = sql("gen_random_uuid()")
  }
  
  column "owner_id" {
    type = uuid
    null = false
  }
  
  column "name" {
    type = text
    null = false
  }
  
  column "color" {
    type = text
    null = false
  }
  
  column "created_at" {
    type = timestamptz
    null = true
    default = sql("now()")
  }
  
  column "updated_at" {
    type = timestamptz
    null = true
    default = sql("now()")
  }
  
  primary_key {
    columns = [column.id]
  }
  
  index "idx_folders_owner_id" {
    columns = [column.owner_id]
  }
}

table "notebooks" {
  schema = schema.public
  
  column "id" {
    type = uuid
    default = sql("gen_random_uuid()")
  }
  
  column "owner_id" {
    type = uuid
    null = false
  }
  
  column "created_by" {
    type = uuid
    null = false
  }
  
  column "folder_id" {
    type = uuid
    null = true
  }
  
  column "name" {
    type = text
    null = false
  }
  
  column "color" {
    type = text
    null = false
  }
  
  column "archived" {
    type = boolean
    null = false
    default = false
  }
  
  column "archived_at" {
    type = timestamptz
    null = true
  }
  
  column "created_at" {
    type = timestamptz
    null = true
    default = sql("now()")
  }
  
  column "updated_at" {
    type = timestamptz
    null = true
    default = sql("now()")
  }
  
  primary_key {
    columns = [column.id]
  }
  
  foreign_key "fk_notebooks_folder" {
    columns     = [column.folder_id]
    ref_columns = [table.folders.column.id]
    on_delete   = CASCADE
  }
  
  index "idx_notebooks_owner_id" {
    columns = [column.owner_id]
  }
  
  index "idx_notebooks_folder_id" {
    columns = [column.folder_id]
  }
}

table "notes" {
  schema = schema.public
  
  column "id" {
    type = uuid
    default = sql("gen_random_uuid()")
  }
  
  column "owner_id" {
    type = uuid
    null = false
  }
  
  column "created_by" {
    type = uuid
    null = false
  }
  
  column "notebook_id" {
    type = uuid
    null = false
  }
  
  column "title" {
    type = text
    null = true
  }
  
  column "content" {
    type = text
    null = true
  }
  
  column "created_at" {
    type = timestamptz
    null = true
    default = sql("now()")
  }
  
  column "updated_at" {
    type = timestamptz
    null = true
    default = sql("now()")
  }
  
  primary_key {
    columns = [column.id]
  }
  
  foreign_key "fk_notes_notebook" {
    columns     = [column.notebook_id]
    ref_columns = [table.notebooks.column.id]
    on_delete   = CASCADE
  }
  
  index "idx_notes_notebook_id" {
    columns = [column.notebook_id]
  }
  
  index "idx_notes_owner_id" {
    columns = [column.owner_id]
  }
}

table "quizzes" {
  schema = schema.public
  
  column "id" {
    type = uuid
    default = sql("gen_random_uuid()")
  }
  
  column "owner_id" {
    type = uuid
    null = false
  }
  
  column "notebook_id" {
    type = uuid
    null = false
  }
  
  column "title" {
    type = text
    null = false
  }
  
  column "description" {
    type = text
    null = true
  }
  
  column "created_at" {
    type = timestamptz
    null = true
    default = sql("now()")
  }
  
  column "updated_at" {
    type = timestamptz
    null = true
    default = sql("now()")
  }
  
  primary_key {
    columns = [column.id]
  }
  
  foreign_key "fk_quizzes_notebook" {
    columns     = [column.notebook_id]
    ref_columns = [table.notebooks.column.id]
    on_delete   = CASCADE
  }
  
  index "idx_quizzes_owner_id" {
    columns = [column.owner_id]
  }
}

table "questions" {
  schema = schema.public
  
  column "id" {
    type = uuid
    default = sql("gen_random_uuid()")
  }
  
  column "quiz_id" {
    type = uuid
    null = false
  }
  
  column "question" {
    type = text
    null = false
  }
  
  column "answer" {
    type = text
    null = false
  }
  
  column "type" {
    type = text
    null = false
  }
  
  column "options" {
    type = jsonb
    null = true
  }
  
  column "order_index" {
    type = integer
    null = false
    default = 0
  }
  
  primary_key {
    columns = [column.id]
  }
  
  foreign_key "fk_questions_quiz" {
    columns     = [column.quiz_id]
    ref_columns = [table.quizzes.column.id]
    on_delete   = CASCADE
  }
  
  index "idx_questions_quiz_id" {
    columns = [column.quiz_id]
  }
}

table "permissions" {
  schema = schema.public
  
  column "id" {
    type = uuid
    default = sql("gen_random_uuid()")
  }
  
  column "resource_type" {
    type = text
    null = false
  }
  
  column "resource_id" {
    type = uuid
    null = false
  }
  
  column "user_id" {
    type = uuid
    null = false
  }
  
  column "permission_level" {
    type = text
    null = false
  }
  
  column "granted_by" {
    type = uuid
    null = true
  }
  
  column "granted_at" {
    type = timestamptz
    null = true
    default = sql("now()")
  }
  
  primary_key {
    columns = [column.id]
  }
  
  index "idx_permissions_user_resource" {
    columns = [column.user_id, column.resource_type, column.resource_id]
    unique = true
  }
}

table "invitations" {
  schema = schema.public
  
  column "id" {
    type = uuid
    default = sql("gen_random_uuid()")
  }
  
  column "resource_type" {
    type = text
    null = false
  }
  
  column "resource_id" {
    type = uuid
    null = false
  }
  
  column "invitee_email" {
    type = text
    null = false
  }
  
  column "permission_level" {
    type = text
    null = false
  }
  
  column "invited_by" {
    type = uuid
    null = false
  }
  
  column "token" {
    type = text
    null = false
  }
  
  column "created_at" {
    type = timestamptz
    null = true
    default = sql("now()")
  }
  
  column "expires_at" {
    type = timestamptz
    null = false
  }
  
  column "accepted_at" {
    type = timestamptz
    null = true
  }
  
  column "accepted_by" {
    type = uuid
    null = true
  }
  
  column "transfer_ownership_on_accept" {
    type = boolean
    null = true
    default = false
  }
  
  primary_key {
    columns = [column.id]
  }
  
  index "idx_invitations_token" {
    columns = [column.token]
    unique = true
  }
  
  index "idx_invitations_email" {
    columns = [column.invitee_email]
  }
}

// Views - Removed (requires Atlas paid account)
// We'll create these separately with raw SQL in views.sql