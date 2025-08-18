terraform {
  required_providers {
    null = {
      source = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

variable "database_url" {
  description = "PostgreSQL connection string"
  type        = string
  sensitive   = true
}

# Single resource to manage the entire database schema
resource "null_resource" "database" {
  # Run the SQL setup script
  provisioner "local-exec" {
    command = <<-EOT
      psql "${var.database_url}" <<'EOF'
      ${file("${path.module}/../setup-database.sql")}
      EOF
    EOT
  }
  
  # Recreate if SQL changes
  triggers = {
    schema_hash = filemd5("${path.module}/../setup-database.sql")
  }
}

output "status" {
  value = "Database schema managed by Terraform"
}