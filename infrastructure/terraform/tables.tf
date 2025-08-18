# Database tables managed by Terraform

# Use null_resource with local-exec to run SQL
# This gives us full control over the schema

resource "null_resource" "database_schema" {
  provisioner "local-exec" {
    command = "psql '${var.database_url}' -f ${path.module}/../setup-database.sql"
  }
  
  # Trigger recreation if the SQL file changes
  triggers = {
    sql_hash = filemd5("${path.module}/../setup-database.sql")
  }
}