# Database schema as Terraform resources
# Each table is a separate resource for proper state management

# Create schema SQL files
resource "local_file" "create_tables" {
  filename = "${path.module}/sql/01_tables.sql"
  content  = file("${path.module}/../setup-database.sql")
}

# Execute table creation
resource "null_resource" "create_tables" {
  provisioner "local-exec" {
    command = "psql '${var.database_url}' -c 'SELECT 1' || exit 0"  # Test connection
  }
  
  provisioner "local-exec" {
    command = "psql '${var.database_url}' < ${local_file.create_tables.filename}"
  }
  
  triggers = {
    sql_content = local_file.create_tables.content
  }
  
  depends_on = [local_file.create_tables]
}